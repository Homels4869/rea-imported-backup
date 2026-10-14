import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;
import java.util.regex.Pattern;

/** Pure producer parser, independent of Ghidra installation and JSON projection. */
public final class ReaGhidraDecompilerWarnings {
    public record DroppedBlock(String start, String addressSpace, String reportedOffset, int warningIndex) {}
    public record Observation(String status, List<String> warnings, String diagnostic,
                              List<DroppedBlock> droppedBlocks) {}

    public static Observation observe(String pseudocode, String diagnostic, boolean available,
                                      Function<String, String> resolveAddress) {
        if (!available) return new Observation("unavailable", List.of(), null, List.of());
        List<String> warnings = new ArrayList<>();
        List<DroppedBlock> dropped = new ArrayList<>();
        if (pseudocode != null) {
            var comments = Pattern.compile("(?m)^\\s*/\\* WARNING: ([\\s\\S]*?)\\*/").matcher(pseudocode);
            while (comments.find()) {
                String text = comments.group(1).strip();
                if (text.isEmpty()) text = comments.group(0).strip();
                int index = warnings.size();
                warnings.add(text);
                var removed = Pattern.compile("Removing unreachable block \\(([^,]+),([^\\)]+)\\)").matcher(text);
                while (removed.find()) {
                    String space = removed.group(1).strip();
                    String offset = removed.group(2).strip();
                    String address = resolveAddress.apply(space + ":" + offset);
                    dropped.add(new DroppedBlock(address, space, offset, index));
                }
            }
        }
        if (diagnostic != null && diagnostic.isBlank()) diagnostic = null;
        return new Observation(warnings.isEmpty() && diagnostic == null ? "no-warnings-reported" : "warnings",
            List.copyOf(warnings), diagnostic, List.copyOf(dropped));
    }
}
