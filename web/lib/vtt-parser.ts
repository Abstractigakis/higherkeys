export interface VTTCue {
    startTime: number;
    endTime: number;
    text: string;
}

export function parseVTT(vttContent: string): VTTCue[] {
    const lines = vttContent.trim().split(/\r?\n/);
    const cues: VTTCue[] = [];

    let currentStart = 0;
    let currentEnd = 0;
    let currentText = "";
    let inCue = false;

    const timeRegex = /(\d{2}):(\d{2}):(\d{2})\.(\d{3})/;

    // Helper to convert timestamp string to seconds
    const parseTime = (timeStr: string): number => {
        const parts = timeStr.match(timeRegex);
        if (!parts) return 0;
        const hours = parseInt(parts[1], 10);
        const minutes = parseInt(parts[2], 10);
        const seconds = parseInt(parts[3], 10);
        const ms = parseInt(parts[4], 10);
        return hours * 3600 + minutes * 60 + seconds + ms / 1000;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        if (trimmedLine === "WEBVTT") continue;

        // Check for timeline
        if (trimmedLine.includes("-->")) {
            // If we were already in a cue, push it before starting the next one
            if (inCue) {
                cues.push({
                    startTime: currentStart,
                    endTime: currentEnd,
                    text: currentText,
                });
            }
            const times = trimmedLine.split("-->");
            if (times.length === 2) {
                currentStart = parseTime(times[0].trim());
                currentEnd = parseTime(times[1].trim());
                inCue = true;
                currentText = ""; // Reset text for this cue
                continue;
            }
        }

        if (inCue) {
            // Accumulate text
            // Don't include the blank line that usually follows a cue
            if (line === "" && currentText === "") {
                // Keep it empty if we haven't started text yet
            } else if (line === "" && i < lines.length - 1 && lines[i+1].trim().includes("-->")) {
                // This is likely the separator line between cues, ignore it
            } else {
                currentText = currentText ? `${currentText}\n${line}` : line;
            }
        }
    }

    // Push the final cue if it exists
    if (inCue) {
        cues.push({
            startTime: currentStart,
            endTime: currentEnd,
            text: currentText,
        });
    }

    return cues;
}
