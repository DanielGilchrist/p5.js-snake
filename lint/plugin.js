const namespaceImports = {
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source.value;
        if (typeof source !== "string" || !source.startsWith(".")) return;
        if (source.endsWith(".json")) return;

        for (const specifier of node.specifiers) {
          if (specifier.type !== "ImportSpecifier") continue;

          context.report({
            message: `Import "${source}" as a namespace (import * as Module) instead of naming "${specifier.imported.name}".`,
            node: specifier,
          });
        }
      },
    };
  },
};

export default {
  meta: { name: "local" },
  rules: { "namespace-imports": namespaceImports },
};
