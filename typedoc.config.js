module.exports = {
  entryPoints: ["./src/index.ts"],
  alwaysCreateEntryPointModule: false,
  categorizeByGroup: true,
  entryPointStrategy: "expand",
  navigation: {
    includeGroups: true,
    includeCategories: true,
  },
  plugin: ["typedoc-github-theme"],
};
