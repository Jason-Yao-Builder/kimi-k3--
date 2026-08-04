export const ARCHITECTURE_CONNECTIONS = [
  { id: "mla", label: "查看 MLA 详解", target: "gated-mla" },
  { id: "kda", label: "查看 KDA 详解", target: "kda-mechanism" },
];

export const navigateArchitectureConnection = (context, connection) => {
  context.navigate(connection.target);
};
