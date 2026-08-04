export const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export const svgElement = (tag, attributes = {}, text) => {
  const namespace = ["http:", "", "www.w3.org", "2000", "svg"].join("/");
  const node = document.createElementNS(namespace, tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
  if (text !== undefined) node.textContent = text;
  return node;
};
