// Minimal client for Moodle's mobile web service API — the same REST
// endpoint the official Moodle mobile app uses, so it works with a plain
// username/password without any special admin setup on most instances.

export class MoodleError extends Error {}

async function callFunction<T>(
  baseUrl: string,
  token: string,
  wsfunction: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const url = new URL(`${baseUrl}/webservice/rest/server.php`);
  url.searchParams.set("wstoken", token);
  url.searchParams.set("wsfunction", wsfunction);
  url.searchParams.set("moodlewsrestformat", "json");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new MoodleError(`Moodle respondió ${res.status} en ${wsfunction}.`);
  }
  const data = await res.json();
  if (data && typeof data === "object" && "exception" in data) {
    throw new MoodleError(
      `Moodle (${wsfunction}): ${data.message ?? data.errorcode ?? "error desconocido"}`,
    );
  }
  return data as T;
}

/** Exchanges username/password for a webservice token — the same call
 *  the Moodle mobile app makes on login. POSTed (not query params) so
 *  credentials don't end up in server/proxy access logs. */
export async function getMoodleToken(
  baseUrl: string,
  username: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/login/token.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username,
      password,
      service: "moodle_mobile_app",
    }),
  });
  if (!res.ok) {
    throw new MoodleError(`No se pudo conectar con el aula virtual (HTTP ${res.status}).`);
  }
  const data = await res.json();
  if (data?.error) {
    throw new MoodleError(
      data.error === "Invalid login, please try again"
        ? "Usuario o contraseña incorrectos."
        : `${data.error}`,
    );
  }
  if (!data?.token) {
    throw new MoodleError("El aula virtual no devolvió un token de acceso.");
  }
  return data.token as string;
}

export type MoodleSiteInfo = { userid: number; fullname: string };

export function getSiteInfo(baseUrl: string, token: string) {
  return callFunction<MoodleSiteInfo>(
    baseUrl,
    token,
    "core_webservice_get_site_info",
  );
}

export type MoodleCourse = {
  id: number;
  fullname: string;
  shortname: string;
};

export function getUserCourses(baseUrl: string, token: string, userId: number) {
  return callFunction<MoodleCourse[]>(
    baseUrl,
    token,
    "core_enrol_get_users_courses",
    { userid: userId },
  );
}

export type MoodleModuleContent = {
  filename: string;
  fileurl: string;
  filesize: number;
  mimetype?: string;
  timemodified: number;
};

export type MoodleModule = {
  id: number;
  name: string;
  modname: string;
  contents?: MoodleModuleContent[];
};

export type MoodleSection = {
  id: number;
  name: string;
  modules: MoodleModule[];
};

export function getCourseContents(
  baseUrl: string,
  token: string,
  courseId: number,
) {
  return callFunction<MoodleSection[]>(
    baseUrl,
    token,
    "core_course_get_contents",
    { courseid: courseId },
  );
}

export type MoodleActionEvent = {
  id: number;
  name: string;
  modulename?: string;
  timesort: number;
  course?: { id: number };
};

export async function getUpcomingEvents(
  baseUrl: string,
  token: string,
): Promise<MoodleActionEvent[]> {
  const result = await callFunction<{ events: MoodleActionEvent[] }>(
    baseUrl,
    token,
    "core_calendar_get_action_events_by_timesort",
    { timesortfrom: Math.floor(Date.now() / 1000), limitnum: 100 },
  );
  return result.events ?? [];
}

/** Appends the webservice token to a Moodle file URL, as required to
 *  download it authenticated (pluginfile.php URLs from get_course_contents
 *  aren't public — they need either a session cookie or ?token=). */
export function withDownloadToken(fileUrl: string, token: string): string {
  const url = new URL(fileUrl);
  url.searchParams.set("token", token);
  return url.toString();
}
