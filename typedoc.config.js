module.exports = {
  entryPoints: ["./src/index.ts"],
  readme: "README.md",
  alwaysCreateEntryPointModule: false,
  categorizeByGroup: true,
  entryPointStrategy: "expand",
  navigation: {
    includeGroups: true,
    includeCategories: true,
  },
  plugin: ["typedoc-github-theme"],
};
