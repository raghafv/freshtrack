/** Turns raw errors into calm, actionable guidance for the user. */

export interface FriendlyError {
  title: string;
  hint: string;
}

function text(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "";
}

export function friendlyError(error: unknown, context?: string): FriendlyError {
  const raw = text(error);
  const m = raw.toLowerCase();

  if (!navigator?.onLine) {
    return {
      title: "You're offline",
      hint: "Reconnect to the internet and try again — nothing was lost.",
    };
  }
  if (m.includes("credits")) {
    return {
      title: "AI credits exhausted",
      hint: "Top up credits in workspace settings, or add the item manually for now.",
    };
  }
  if (m.includes("busy") || m.includes("429") || m.includes("rate")) {
    return { title: "AI is busy", hint: "Wait a few seconds and tap try again." };
  }
  if (m.includes("not configured")) {
    return { title: "AI isn't set up", hint: "Add items manually while AI is unavailable." };
  }
  if (m.includes("permission") || m.includes("notallowed") || m.includes("denied")) {
    return {
      title: "Camera access blocked",
      hint: "Allow camera permission in your browser settings, or upload a photo from your gallery.",
    };
  }
  if (m.includes("upload") || m.includes("storage") || m.includes("payload")) {
    return {
      title: "Photo upload failed",
      hint: "Try a smaller photo, or save the item without a picture.",
    };
  }
  if (m.includes("fetch") || m.includes("network") || m.includes("timeout")) {
    return {
      title: "Connection problem",
      hint: "Check your network and try again — your data is safe.",
    };
  }
  if (m.includes("jwt") || m.includes("unauthor") || m.includes("session")) {
    return { title: "Session expired", hint: "Sign in again to continue." };
  }
  if (m.includes("not found") || m.includes("404")) {
    return {
      title: context ? `${context} not found` : "Not found",
      hint: "Enter the details once and FreshTrack will remember it next time.",
    };
  }
  if (m.includes("could not read") || m.includes("ocr") || m.includes("analyse")) {
    return {
      title: "Couldn't read that photo",
      hint: "Retake it in better light with the label flat and fully in frame.",
    };
  }

  return {
    title: context ?? "Something went wrong",
    hint: raw && raw.length < 120 ? raw : "Please try again in a moment.",
  };
}

/** Single-line message suitable for a toast description. */
export function friendlyMessage(error: unknown, context?: string): string {
  const f = friendlyError(error, context);
  return `${f.title} — ${f.hint}`;
}
