import { describe, expect, it } from "vitest";
import { formatRecordingDuration, formatRecordingName } from "../features/notes/AudioRecording";

describe("voice memo formatting", () => {
  it("uses the recording start timestamp as the default name", () => {
    expect(formatRecordingName(new Date(2026, 6, 16, 9, 5, 7))).toBe("2026-07-16 09:05:07");
  });

  it("formats elapsed recording time without changing the layout width", () => {
    expect(formatRecordingDuration(0)).toBe("00:00");
    expect(formatRecordingDuration(65_900)).toBe("01:05");
  });
});
