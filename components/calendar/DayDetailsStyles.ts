import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "capitalize",
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 15,
  },
  taskItem: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
    padding: 12,
  },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.2)",
    marginBottom: 8,
  },
  taskCardCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderLeftColor: "#22C55E",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  taskCardRepeating: {
    backgroundColor: "transparent",
    borderLeftColor: "#007AFF",
    borderColor: "rgba(0, 122, 255, 0.2)",
  },
  taskCheckbox: {
    fontSize: 16,
    marginRight: 12,
  },
  taskContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "transparent",
    flex: 1,
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  taskTextContainer: {
    backgroundColor: "transparent",
    flex: 1,
  },
  taskText: {
    fontSize: 16,
    lineHeight: 22,
  },
  taskTextCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  completedTask: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    fontSize: 16,
    minHeight: 40,
  },
  indicators: {
    flexDirection: "row",
    marginTop: 4,
  },
  taskIcons: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
  },
  indicator: {
    fontSize: 12,
    marginRight: 4,
  },
  taskIcon: {
    fontSize: 12,
  },
  actions: {
    marginLeft: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyText: {
    textAlign: "center",
    fontStyle: "italic",
    opacity: 0.6,
    marginTop: 40,
    fontSize: 16,
  },
  addTaskContainer: {
    padding: 20,
    borderTopWidth: 1,
  },
  limitMessageContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(255, 136, 0, 0.1)",
  },
  limitMessage: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  limitSubMessage: {
    fontSize: 12,
    textAlign: "center",
    opacity: 0.8,
    fontStyle: "italic",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  addTaskInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
    minHeight: 50,
    maxHeight: 100,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
});
