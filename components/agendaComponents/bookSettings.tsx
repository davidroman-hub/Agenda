import { ThemedView } from "../themed-view";
import ExpandoButton from "./settings/expandoButton";

interface BookActionsProps {
  scrollProgress?: number;
  isAtBottom?: boolean;
}

export default function BookActions({ 
  scrollProgress = 0, 
  isAtBottom = false 
}: BookActionsProps) {
  return (
    <ThemedView>
      <ExpandoButton 
        scrollProgress={scrollProgress}
        isAtBottom={isAtBottom}
      />
    </ThemedView>
  );
}
