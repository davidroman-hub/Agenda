export const modalStyles = (colorScheme: "light" | "dark", colors: any) => ({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 20,
  },
  container: {
    backgroundColor: colorScheme === "dark" ? "#2c2c2c" : "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "100%" as const,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold" as const,
    marginBottom: 16,
    textAlign: "center" as const,
    color: colorScheme === "dark" ? "#ffffff" : "#000000",
  },
  input: {
    borderWidth: 1,
    borderColor: colorScheme === "dark" ? "#404040" : "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colorScheme === "dark" ? "#ffffff" : "#000000",
    backgroundColor: colorScheme === "dark" ? "#1a1a1a" : "#f8f9fa",
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: "top" as const,
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cancelButton: {
    backgroundColor: colorScheme === "dark" ? "#404040" : "#e0e0e0",
  },
  deleteButton: {
    backgroundColor: "#ff4757",
  },
  completedButton: {
    backgroundColor: "#4CAF50",
  },
  incompleteButton: {
    backgroundColor: "#FFA500",
  },
  saveButton: {
    backgroundColor: "#2196f3",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  buttonTextSmall: {
    fontSize: 12,
    marginLeft: 10,
    fontWeight: "600" as const,
  },
  cancelButtonText: {
    color: colorScheme === "dark" ? "#ffffff" : "#333333",
  },
  deleteButtonText: {
    color: "#ffffff",
  },
  saveButtonText: {
    color: "#ffffff",
  },
  reminderContainer: {
    display: "flex" as const,
    flexDirection: "row" as const,
    marginBottom: 20,
  },
});
