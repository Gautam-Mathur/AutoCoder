export class KnowledgeResolver {
  private static CAPABILITIES_DB: Record<string, string[]> = {
    'html5-vanilla': ['localstorage', 'canvas-api', 'fetch-client'],
    'react-node-express': ['rest-api', 'websocket-connection', 'jwt-auth', 'prisma-orm', 'sqlite-db'],
  };

  private static RESTRICTIONS_DB: Record<string, string[]> = {
    'html5-vanilla': ['no-require', 'no-module-exports', 'no-es-imports-without-babel'],
  };

  public conventions(language: string): string {
    if (!language) return 'Follow standard styling guidelines.';
    return language.toLowerCase() === 'typescript'
      ? 'Always declare explicit interface types. Enforce strict null checks.'
      : 'Follow standard styling guidelines.';
  }

  public capabilities(platform: string): string[] {
    return KnowledgeResolver.CAPABILITIES_DB[platform] || [];
  }

  public restrictions(platform: string): string[] {
    return KnowledgeResolver.RESTRICTIONS_DB[platform] || [];
  }
}
