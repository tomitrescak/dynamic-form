const interleave = (strings: TemplateStringsArray, ...interpolations: any[]) =>
  strings.reduce(
    (final, str, i) => final + str + (interpolations[i] === undefined ? '' : interpolations[i]),
    ''
  );

type Config = {
  setDirty?(isDirty: boolean): void;
  i18n(strings: TemplateStringsArray, ...interpolations: any[]): string;
};

export const config: Config = {
  i18n: interleave
};
