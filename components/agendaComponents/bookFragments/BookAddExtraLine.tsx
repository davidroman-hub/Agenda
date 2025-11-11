import useAgendaTasksStore from "@/stores/agenda-tasks-store";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";

const AddExtraLine = ({
  linesPerPage,
  date,
}: {
  linesPerPage: number;
  date: string;
}) => {
  const editing = false;
  const { setAdditionalLinesForDate, linesStatus } = useAgendaTasksStore();
  const additionalLine = linesStatus[date]?.extraLines || 0;

  // No mostrar el botón si ya se alcanzó el máximo de líneas
  if (additionalLine + linesPerPage >= 20) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[
        styles.addButton,
        {
          backgroundColor: "#007AFF",
        },
      ]}
      onPress={() => {
        setAdditionalLinesForDate(date, 1 + additionalLine);
      }}
      //   disabled={availableLines.length === 0 || isCreatingTask}
    >
      {editing ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Icon name="plus" size={10} color="white" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  addButton: {
    position: "absolute",
    bottom: -2,
    zIndex: 1,
    right: -1,
    width: 25,
    height: 25,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default AddExtraLine;
