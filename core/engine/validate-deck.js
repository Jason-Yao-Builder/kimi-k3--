export function validateDeck(deck, componentTypes = new Set()) {
  const errors = [];
  const ids = new Set();
  if (!deck?.meta?.title) errors.push("deck.meta.title 缺失");
  if (!Array.isArray(deck?.slides) || deck.slides.length === 0) errors.push("deck.slides 必须是非空数组");

  for (const slide of deck.slides || []) {
    if (!slide.id) errors.push("存在没有 id 的 Slide");
    if (ids.has(slide.id)) errors.push(`Slide id 重复：${slide.id}`);
    ids.add(slide.id);
    if (!slide.title) errors.push(`${slide.id}: title 缺失`);
    if (!slide.layout) errors.push(`${slide.id}: layout 缺失`);
    if (!Array.isArray(slide.blocks)) errors.push(`${slide.id}: blocks 必须是数组`);
    validateBlocks(slide.blocks || [], slide.id, 0, componentTypes, errors);
  }

  for (const slide of deck.slides || []) {
    for (const edge of slide.edges || []) {
      if (edge.target && !ids.has(edge.target)) errors.push(`${slide.id}: 边指向不存在的 ${edge.target}`);
    }
  }
  return errors;
}

function validateBlocks(blocks, slideId, trackDepth, componentTypes, errors) {
  blocks.forEach((block, index) => {
    const path = `${slideId}.blocks[${index}]`;
    if (!componentTypes.has(block.type)) errors.push(`${path}: 未注册组件 ${block.type}`);
    if (block.editor) {
      const values = [block.editor.x, block.editor.y, block.editor.w, block.editor.h, block.editor.z];
      if (values.some((value) => !Number.isFinite(value))) errors.push(`${path}: 编辑几何数据无效`);
      if (block.editor.w < 1 || block.editor.h < 1) errors.push(`${path}: 编辑尺寸必须大于 0`);
      if (block.editor.x < 0 || block.editor.y < 0 || block.editor.x + block.editor.w > 100.01 || block.editor.y + block.editor.h > 100.01) {
        errors.push(`${path}: 编辑元素超出画布`);
      }
    }
    if (block.src && !block.src.startsWith("./") && !block.src.startsWith("../")) {
      errors.push(`${path}: 资产必须使用相对路径`);
    }
    if (block.type !== "track") return;
    if (trackDepth >= 1) errors.push(`${path}: 首期最多允许一层局部 Track`);
    if (!block.id) errors.push(`${path}: Track 必须有 id`);
    for (const item of block.items || []) {
      validateBlocks(item.blocks || [], slideId, trackDepth + 1, componentTypes, errors);
    }
  });
}
