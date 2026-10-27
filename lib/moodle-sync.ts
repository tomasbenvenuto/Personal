import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { buildStorageKey, extractDocumentText } from "@/lib/documents";
import { putObject } from "@/lib/r2";
import {
  getCourseContents,
  getMoodleToken,
  getSiteInfo,
  getUpcomingEvents,
  getUserCourses,
  withDownloadToken,
} from "@/lib/moodle";

function isPdf(content: { filename: string; mimetype?: string }) {
  return (
    content.mimetype === "application/pdf" ||
    content.filename.toLowerCase().endsWith(".pdf")
  );
}

function mapEventType(modulename?: string): "ASSIGNMENT" | "QUIZ" | "EVENT" {
  if (modulename === "assign") return "ASSIGNMENT";
  if (modulename === "quiz") return "QUIZ";
  return "EVENT";
}

/**
 * Runs a full sync for the user's connected Moodle account: refreshes the
 * token, pulls enrolled courses, imports any PDF course materials not
 * already in the library (reusing the same upload+extraction pipeline as
 * manual uploads), and pulls upcoming assignment/quiz/event dates.
 *
 * Per-course and per-file failures are collected rather than aborting the
 * whole sync, so one broken file doesn't block the rest.
 */
export async function runMoodleSync(userId: string) {
  const account = await prisma.moodleAccount.findUniqueOrThrow({
    where: { userId },
  });

  await prisma.moodleAccount.update({
    where: { userId },
    data: { lastSyncStatus: "SYNCING" },
  });

  const warnings: string[] = [];

  try {
    const password = decrypt(account.encryptedPassword);
    const token = await getMoodleToken(account.baseUrl, account.username, password);
    const siteInfo = await getSiteInfo(account.baseUrl, token);

    const courses = await getUserCourses(account.baseUrl, token, siteInfo.userid);

    let importedCount = 0;

    for (const moodleCourse of courses) {
      try {
        const course = await prisma.course.upsert({
          where: {
            moodleAccountId_moodleCourseId: {
              moodleAccountId: account.id,
              moodleCourseId: moodleCourse.id,
            },
          },
          update: {
            fullName: moodleCourse.fullname,
            shortName: moodleCourse.shortname,
          },
          create: {
            moodleAccountId: account.id,
            moodleCourseId: moodleCourse.id,
            fullName: moodleCourse.fullname,
            shortName: moodleCourse.shortname,
          },
        });

        const sections = await getCourseContents(
          account.baseUrl,
          token,
          moodleCourse.id,
        );

        for (const section of sections) {
          for (const mod of section.modules) {
            for (const content of mod.contents ?? []) {
              if (!isPdf(content)) continue;

              try {
                const existing = await prisma.document.findFirst({
                  where: { userId, moodleFileUrl: content.fileurl },
                });
                if (existing) continue;

                const downloadUrl = withDownloadToken(content.fileurl, token);
                const fileRes = await fetch(downloadUrl);
                if (!fileRes.ok) {
                  warnings.push(`No se pudo descargar "${content.filename}"`);
                  continue;
                }
                const buffer = Buffer.from(await fileRes.arrayBuffer());

                const storageKey = buildStorageKey(userId, content.filename);
                await putObject(storageKey, buffer, "application/pdf");

                const document = await prisma.document.create({
                  data: {
                    userId,
                    title: content.filename.replace(/\.pdf$/i, ""),
                    originalName: content.filename,
                    storageKey,
                    fileSizeBytes: content.filesize || buffer.byteLength,
                    status: "UPLOADED",
                    source: "MOODLE_SYNC",
                    courseId: course.id,
                    moodleFileUrl: content.fileurl,
                  },
                });

                await extractDocumentText(document.id);
                importedCount += 1;
              } catch (err) {
                warnings.push(
                  `Error importando "${content.filename}": ${
                    err instanceof Error ? err.message : String(err)
                  }`,
                );
              }
            }
          }
        }
      } catch (err) {
        warnings.push(
          `Error en la materia "${moodleCourse.fullname}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    try {
      const events = await getUpcomingEvents(account.baseUrl, token);
      const courseByMoodleId = new Map(
        (
          await prisma.course.findMany({ where: { moodleAccountId: account.id } })
        ).map((c) => [c.moodleCourseId, c]),
      );

      for (const event of events) {
        const course = event.course && courseByMoodleId.get(event.course.id);
        if (!course) continue;

        await prisma.courseEvent.upsert({
          where: {
            courseId_moodleEventId: {
              courseId: course.id,
              moodleEventId: event.id,
            },
          },
          update: {
            title: event.name,
            type: mapEventType(event.modulename),
            dueDate: new Date(event.timesort * 1000),
          },
          create: {
            courseId: course.id,
            moodleEventId: event.id,
            title: event.name,
            type: mapEventType(event.modulename),
            dueDate: new Date(event.timesort * 1000),
          },
        });
      }
    } catch (err) {
      warnings.push(
        `No se pudieron traer las fechas: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    const summary = `${importedCount} PDF nuevo${importedCount === 1 ? "" : "s"} importado${importedCount === 1 ? "" : "s"}.${
      warnings.length ? ` ${warnings.length} advertencia(s): ${warnings.slice(0, 5).join(" | ")}` : ""
    }`;

    await prisma.moodleAccount.update({
      where: { userId },
      data: {
        moodleUserId: siteInfo.userid,
        lastSyncedAt: new Date(),
        lastSyncStatus: warnings.length ? "PARTIAL" : "SUCCESS",
        lastSyncMessage: summary.slice(0, 1000),
      },
    });

    return { importedCount, warnings };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.moodleAccount.update({
      where: { userId },
      data: {
        lastSyncedAt: new Date(),
        lastSyncStatus: "FAILED",
        lastSyncMessage: message.slice(0, 1000),
      },
    });
    throw err;
  }
}
