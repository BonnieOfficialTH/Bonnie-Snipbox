export function toCollectionModel(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: Number(row.created_at ?? Date.now()),
    updatedAt: Number(row.updated_at ?? Date.now()),
  };
}

export function toCollectionRow(model) {
  if (!model) return {};
  const row = {};
  if (model.id !== undefined) row.id = model.id;
  if (model.name !== undefined) row.name = model.name;
  if (model.color !== undefined) row.color = model.color;
  if (model.sortOrder !== undefined) row.sort_order = model.sortOrder;
  if (model.createdAt !== undefined) row.created_at = model.createdAt;
  if (model.updatedAt !== undefined) row.updated_at = model.updatedAt;
  if (model.deletedAt !== undefined) row.deleted_at = model.deletedAt;
  return row;
}

export function toSnippetModel(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    icon: row.icon || '',
    content: row.content || '',
    dynamicFields: row.dynamic_fields || [],
    createdAt: Number(row.created_at ?? Date.now()),
    updatedAt: Number(row.updated_at ?? Date.now()),
  };
}

export function toSnippetRow(model) {
  if (!model) return {};
  const row = {};
  if (model.id !== undefined) row.id = model.id;
  if (model.title !== undefined) row.title = model.title;
  if (model.categoryId !== undefined) row.category_id = model.categoryId;
  if (model.icon !== undefined) row.icon = model.icon;
  if (model.content !== undefined) row.content = model.content;
  if (model.dynamicFields !== undefined) row.dynamic_fields = model.dynamicFields;
  if (model.createdAt !== undefined) row.created_at = model.createdAt;
  if (model.updatedAt !== undefined) row.updated_at = model.updatedAt;
  if (model.deletedAt !== undefined) row.deleted_at = model.deletedAt;
  return row;
}
