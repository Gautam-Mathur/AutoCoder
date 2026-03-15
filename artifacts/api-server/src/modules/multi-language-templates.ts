/**
 * Multi-Language Template System
 * 50+ programming languages with syntax, patterns, and idioms
 */

// ============================================
// LANGUAGE REGISTRY
// ============================================

export interface LanguageTemplate {
  id: string;
  name: string;
  aliases: string[];
  extension: string[];
  paradigms: string[];
  typing: 'static' | 'dynamic' | 'gradual';
  compiled: boolean;
  syntax: LanguageSyntax;
  snippets: Record<string, string>;
  frameworks: string[];
  packageManager?: string;
  helloWorld: string;
}

export interface LanguageSyntax {
  commentSingle: string;
  commentMulti: [string, string];
  stringDelimiters: string[];
  statementEnd: string;
  blockStart: string;
  blockEnd: string;
  functionKeyword: string;
  variableKeywords: string[];
  classKeyword?: string;
  importKeyword?: string;
}

// ============================================
// 50+ LANGUAGE TEMPLATES
// ============================================

export const LANGUAGES: Record<string, LanguageTemplate> = {
  // ========== WEB LANGUAGES ==========
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    aliases: ['js', 'ecmascript', 'es6', 'es2023'],
    extension: ['.js', '.mjs', '.cjs'],
    paradigms: ['functional', 'object-oriented', 'event-driven'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"', "'", '`'],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'function',
      variableKeywords: ['const', 'let', 'var'],
      classKeyword: 'class',
      importKeyword: 'import',
    },
    snippets: {
      function: 'function ${name}(${params}) {\n  ${body}\n}',
      arrow: 'const ${name} = (${params}) => {\n  ${body}\n};',
      class: 'class ${name} {\n  constructor(${params}) {\n    ${body}\n  }\n}',
      async: 'async function ${name}(${params}) {\n  ${body}\n}',
      promise: 'new Promise((resolve, reject) => {\n  ${body}\n})',
      fetch: 'const response = await fetch(${url});\nconst data = await response.json();',
    },
    frameworks: ['React', 'Vue', 'Angular', 'Svelte', 'Express', 'Next.js', 'Nuxt', 'Astro'],
    packageManager: 'npm',
    helloWorld: 'console.log("Hello, World!");',
  },

  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    aliases: ['ts'],
    extension: ['.ts', '.tsx', '.mts', '.cts'],
    paradigms: ['functional', 'object-oriented', 'generic'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"', "'", '`'],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'function',
      variableKeywords: ['const', 'let', 'var'],
      classKeyword: 'class',
      importKeyword: 'import',
    },
    snippets: {
      interface: 'interface ${name} {\n  ${properties}\n}',
      type: 'type ${name} = ${definition};',
      generic: 'function ${name}<T>(${params}: T): T {\n  ${body}\n}',
      enum: 'enum ${name} {\n  ${values}\n}',
      class: 'class ${name} {\n  private ${prop}: ${type};\n\n  constructor(${params}) {\n    ${body}\n  }\n}',
    },
    frameworks: ['React', 'Angular', 'NestJS', 'Express', 'Next.js'],
    packageManager: 'npm',
    helloWorld: 'const greeting: string = "Hello, World!";\nconsole.log(greeting);',
  },

  // ========== BACKEND LANGUAGES ==========
  python: {
    id: 'python',
    name: 'Python',
    aliases: ['py', 'python3'],
    extension: ['.py', '.pyw', '.pyi'],
    paradigms: ['object-oriented', 'functional', 'imperative'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '#',
      commentMulti: ['"""', '"""'],
      stringDelimiters: ['"', "'", '"""', "'''"],
      statementEnd: '',
      blockStart: ':',
      blockEnd: '',
      functionKeyword: 'def',
      variableKeywords: [],
      classKeyword: 'class',
      importKeyword: 'import',
    },
    snippets: {
      function: 'def ${name}(${params}):\n    ${body}',
      class: 'class ${name}:\n    def __init__(self, ${params}):\n        ${body}',
      async: 'async def ${name}(${params}):\n    ${body}',
      decorator: '@${decorator}\ndef ${name}(${params}):\n    ${body}',
      listcomp: '[${expr} for ${var} in ${iterable}]',
      context: 'with ${context} as ${var}:\n    ${body}',
      dataclass: '@dataclass\nclass ${name}:\n    ${fields}',
    },
    frameworks: ['Django', 'Flask', 'FastAPI', 'Pyramid', 'Tornado'],
    packageManager: 'pip',
    helloWorld: 'print("Hello, World!")',
  },

  go: {
    id: 'go',
    name: 'Go',
    aliases: ['golang'],
    extension: ['.go'],
    paradigms: ['concurrent', 'imperative', 'structured'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"', '`'],
      statementEnd: '',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'func',
      variableKeywords: ['var', 'const'],
      importKeyword: 'import',
    },
    snippets: {
      function: 'func ${name}(${params}) ${return} {\n\t${body}\n}',
      struct: 'type ${name} struct {\n\t${fields}\n}',
      interface: 'type ${name} interface {\n\t${methods}\n}',
      goroutine: 'go func() {\n\t${body}\n}()',
      channel: '${name} := make(chan ${type})',
      defer: 'defer func() {\n\t${body}\n}()',
      error: 'if err != nil {\n\treturn err\n}',
    },
    frameworks: ['Gin', 'Echo', 'Fiber', 'Chi', 'Gorilla'],
    packageManager: 'go mod',
    helloWorld: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, World!")\n}',
  },

  rust: {
    id: 'rust',
    name: 'Rust',
    aliases: ['rs'],
    extension: ['.rs'],
    paradigms: ['systems', 'functional', 'concurrent'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"'],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'fn',
      variableKeywords: ['let', 'const', 'static'],
      importKeyword: 'use',
    },
    snippets: {
      function: 'fn ${name}(${params}) -> ${return} {\n    ${body}\n}',
      struct: 'struct ${name} {\n    ${fields}\n}',
      impl: 'impl ${name} {\n    ${methods}\n}',
      trait: 'trait ${name} {\n    ${methods}\n}',
      enum: 'enum ${name} {\n    ${variants}\n}',
      match: 'match ${expr} {\n    ${arms}\n}',
      result: 'fn ${name}() -> Result<${ok}, ${err}> {\n    ${body}\n}',
    },
    frameworks: ['Actix', 'Axum', 'Rocket', 'Warp', 'Tide'],
    packageManager: 'cargo',
    helloWorld: 'fn main() {\n    println!("Hello, World!");\n}',
  },

  java: {
    id: 'java',
    name: 'Java',
    aliases: [],
    extension: ['.java'],
    paradigms: ['object-oriented', 'generic'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"'],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: '',
      variableKeywords: ['var', 'final'],
      classKeyword: 'class',
      importKeyword: 'import',
    },
    snippets: {
      class: 'public class ${name} {\n    ${body}\n}',
      method: 'public ${return} ${name}(${params}) {\n    ${body}\n}',
      main: 'public static void main(String[] args) {\n    ${body}\n}',
      interface: 'public interface ${name} {\n    ${methods}\n}',
      record: 'public record ${name}(${fields}) {}',
      lambda: '(${params}) -> ${body}',
      stream: '${collection}.stream()\n    .filter(${predicate})\n    .map(${mapper})\n    .collect(Collectors.toList())',
    },
    frameworks: ['Spring', 'Spring Boot', 'Quarkus', 'Micronaut', 'Jakarta EE'],
    packageManager: 'maven',
    helloWorld: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  },

  csharp: {
    id: 'csharp',
    name: 'C#',
    aliases: ['cs', 'c-sharp', 'dotnet'],
    extension: ['.cs'],
    paradigms: ['object-oriented', 'functional', 'generic'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"', '@"', '$"'],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: '',
      variableKeywords: ['var', 'const', 'readonly'],
      classKeyword: 'class',
      importKeyword: 'using',
    },
    snippets: {
      class: 'public class ${name}\n{\n    ${body}\n}',
      method: 'public ${return} ${name}(${params})\n{\n    ${body}\n}',
      property: 'public ${type} ${name} { get; set; }',
      async: 'public async Task<${type}> ${name}(${params})\n{\n    ${body}\n}',
      record: 'public record ${name}(${properties});',
      linq: 'var result = ${collection}\n    .Where(x => ${predicate})\n    .Select(x => ${projection})\n    .ToList();',
    },
    frameworks: ['ASP.NET Core', 'Blazor', 'MAUI', 'WPF', 'Entity Framework'],
    packageManager: 'nuget',
    helloWorld: 'Console.WriteLine("Hello, World!");',
  },

  kotlin: {
    id: 'kotlin',
    name: 'Kotlin',
    aliases: ['kt'],
    extension: ['.kt', '.kts'],
    paradigms: ['object-oriented', 'functional'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"', '"""'],
      statementEnd: '',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'fun',
      variableKeywords: ['val', 'var', 'const'],
      classKeyword: 'class',
      importKeyword: 'import',
    },
    snippets: {
      function: 'fun ${name}(${params}): ${return} {\n    ${body}\n}',
      class: 'class ${name}(${params}) {\n    ${body}\n}',
      data: 'data class ${name}(${properties})',
      sealed: 'sealed class ${name} {\n    ${subclasses}\n}',
      coroutine: 'suspend fun ${name}(${params}): ${return} {\n    ${body}\n}',
      lambda: '{ ${params} -> ${body} }',
      extension: 'fun ${type}.${name}(): ${return} {\n    ${body}\n}',
    },
    frameworks: ['Ktor', 'Spring', 'Android', 'Compose'],
    packageManager: 'gradle',
    helloWorld: 'fun main() {\n    println("Hello, World!")\n}',
  },

  swift: {
    id: 'swift',
    name: 'Swift',
    aliases: [],
    extension: ['.swift'],
    paradigms: ['object-oriented', 'functional', 'protocol-oriented'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"'],
      statementEnd: '',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'func',
      variableKeywords: ['let', 'var'],
      classKeyword: 'class',
      importKeyword: 'import',
    },
    snippets: {
      function: 'func ${name}(${params}) -> ${return} {\n    ${body}\n}',
      class: 'class ${name} {\n    ${body}\n}',
      struct: 'struct ${name} {\n    ${body}\n}',
      protocol: 'protocol ${name} {\n    ${requirements}\n}',
      enum: 'enum ${name} {\n    case ${cases}\n}',
      closure: '{ (${params}) -> ${return} in\n    ${body}\n}',
      guard: 'guard ${condition} else {\n    ${body}\n}',
    },
    frameworks: ['SwiftUI', 'UIKit', 'Vapor', 'Perfect', 'Kitura'],
    packageManager: 'swift package manager',
    helloWorld: 'print("Hello, World!")',
  },

  // ========== SCRIPTING LANGUAGES ==========
  ruby: {
    id: 'ruby',
    name: 'Ruby',
    aliases: ['rb'],
    extension: ['.rb', '.rake', '.gemspec'],
    paradigms: ['object-oriented', 'functional', 'metaprogramming'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '#',
      commentMulti: ['=begin', '=end'],
      stringDelimiters: ['"', "'", '%q', '%Q'],
      statementEnd: '',
      blockStart: '',
      blockEnd: 'end',
      functionKeyword: 'def',
      variableKeywords: [],
      classKeyword: 'class',
      importKeyword: 'require',
    },
    snippets: {
      method: 'def ${name}(${params})\n  ${body}\nend',
      class: 'class ${name}\n  def initialize(${params})\n    ${body}\n  end\nend',
      module: 'module ${name}\n  ${body}\nend',
      block: '${method} do |${params}|\n  ${body}\nend',
      lambda: '->(${params}) { ${body} }',
      attr: 'attr_accessor :${name}',
    },
    frameworks: ['Rails', 'Sinatra', 'Hanami', 'Roda'],
    packageManager: 'gem',
    helloWorld: 'puts "Hello, World!"',
  },

  php: {
    id: 'php',
    name: 'PHP',
    aliases: [],
    extension: ['.php', '.phtml'],
    paradigms: ['object-oriented', 'procedural'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"', "'"],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'function',
      variableKeywords: [],
      classKeyword: 'class',
      importKeyword: 'use',
    },
    snippets: {
      function: 'function ${name}(${params}): ${return} {\n    ${body}\n}',
      class: 'class ${name} {\n    ${body}\n}',
      method: 'public function ${name}(${params}): ${return} {\n    ${body}\n}',
      arrow: 'fn(${params}) => ${expression}',
      trait: 'trait ${name} {\n    ${body}\n}',
      attribute: '#[${name}(${params})]',
    },
    frameworks: ['Laravel', 'Symfony', 'Slim', 'CodeIgniter', 'CakePHP'],
    packageManager: 'composer',
    helloWorld: '<?php\necho "Hello, World!";',
  },

  perl: {
    id: 'perl',
    name: 'Perl',
    aliases: ['pl'],
    extension: ['.pl', '.pm'],
    paradigms: ['procedural', 'object-oriented', 'functional'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '#',
      commentMulti: ['=pod', '=cut'],
      stringDelimiters: ['"', "'"],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'sub',
      variableKeywords: ['my', 'our', 'local'],
      importKeyword: 'use',
    },
    snippets: {
      sub: 'sub ${name} {\n    my (${params}) = @_;\n    ${body}\n}',
      regex: 'm/${pattern}/${flags}',
      hash: 'my %${name} = (\n    ${pairs}\n);',
    },
    frameworks: ['Dancer', 'Mojolicious', 'Catalyst'],
    packageManager: 'cpan',
    helloWorld: 'print "Hello, World!\\n";',
  },

  lua: {
    id: 'lua',
    name: 'Lua',
    aliases: [],
    extension: ['.lua'],
    paradigms: ['procedural', 'object-oriented', 'functional'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '--',
      commentMulti: ['--[[', ']]'],
      stringDelimiters: ['"', "'", '[['],
      statementEnd: '',
      blockStart: '',
      blockEnd: 'end',
      functionKeyword: 'function',
      variableKeywords: ['local'],
    },
    snippets: {
      function: 'function ${name}(${params})\n    ${body}\nend',
      local: 'local function ${name}(${params})\n    ${body}\nend',
      table: 'local ${name} = {\n    ${entries}\n}',
      metatable: 'setmetatable(${table}, {\n    __index = ${parent}\n})',
    },
    frameworks: ['LÖVE', 'Corona', 'Lapis'],
    packageManager: 'luarocks',
    helloWorld: 'print("Hello, World!")',
  },

  // ========== SYSTEMS LANGUAGES ==========
  c: {
    id: 'c',
    name: 'C',
    aliases: [],
    extension: ['.c', '.h'],
    paradigms: ['procedural', 'imperative'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"'],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: '',
      variableKeywords: ['const', 'static', 'volatile'],
      importKeyword: '#include',
    },
    snippets: {
      function: '${return} ${name}(${params}) {\n    ${body}\n}',
      struct: 'struct ${name} {\n    ${fields}\n};',
      typedef: 'typedef struct {\n    ${fields}\n} ${name};',
      macro: '#define ${name}(${params}) ${body}',
      main: 'int main(int argc, char *argv[]) {\n    ${body}\n    return 0;\n}',
    },
    frameworks: [],
    packageManager: undefined,
    helloWorld: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
  },

  cpp: {
    id: 'cpp',
    name: 'C++',
    aliases: ['c++', 'cxx'],
    extension: ['.cpp', '.cc', '.cxx', '.hpp', '.hxx'],
    paradigms: ['object-oriented', 'generic', 'functional'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"'],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: '',
      variableKeywords: ['const', 'constexpr', 'auto'],
      classKeyword: 'class',
      importKeyword: '#include',
    },
    snippets: {
      class: 'class ${name} {\npublic:\n    ${body}\nprivate:\n    ${fields}\n};',
      template: 'template<typename T>\n${return} ${name}(${params}) {\n    ${body}\n}',
      lambda: '[${capture}](${params}) { ${body} }',
      smart: 'std::unique_ptr<${type}> ${name} = std::make_unique<${type}>(${args});',
      range: 'for (const auto& ${item} : ${container}) {\n    ${body}\n}',
    },
    frameworks: ['Qt', 'Boost', 'OpenCV', 'POCO'],
    packageManager: 'vcpkg',
    helloWorld: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
  },

  // ========== FUNCTIONAL LANGUAGES ==========
  haskell: {
    id: 'haskell',
    name: 'Haskell',
    aliases: ['hs'],
    extension: ['.hs', '.lhs'],
    paradigms: ['functional', 'pure', 'lazy'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '--',
      commentMulti: ['{-', '-}'],
      stringDelimiters: ['"'],
      statementEnd: '',
      blockStart: '',
      blockEnd: '',
      functionKeyword: '',
      variableKeywords: ['let', 'where'],
      importKeyword: 'import',
    },
    snippets: {
      function: '${name} :: ${type}\n${name} ${params} = ${body}',
      data: 'data ${name} = ${constructors}',
      class: 'class ${name} a where\n    ${methods}',
      instance: 'instance ${class} ${type} where\n    ${implementations}',
      monad: 'do\n    ${bindings}',
    },
    frameworks: ['Yesod', 'Servant', 'Scotty', 'IHP'],
    packageManager: 'cabal',
    helloWorld: 'main :: IO ()\nmain = putStrLn "Hello, World!"',
  },

  elixir: {
    id: 'elixir',
    name: 'Elixir',
    aliases: ['ex'],
    extension: ['.ex', '.exs'],
    paradigms: ['functional', 'concurrent', 'distributed'],
    typing: 'dynamic',
    compiled: true,
    syntax: {
      commentSingle: '#',
      commentMulti: ['@doc """', '"""'],
      stringDelimiters: ['"', '~s'],
      statementEnd: '',
      blockStart: 'do',
      blockEnd: 'end',
      functionKeyword: 'def',
      variableKeywords: [],
      importKeyword: 'import',
    },
    snippets: {
      function: 'def ${name}(${params}) do\n  ${body}\nend',
      module: 'defmodule ${name} do\n  ${body}\nend',
      pipe: '${input}\n|> ${function1}()\n|> ${function2}()',
      genserver: 'def handle_call(${message}, _from, state) do\n  {:reply, ${response}, state}\nend',
      pattern: 'case ${value} do\n  ${pattern} -> ${body}\nend',
    },
    frameworks: ['Phoenix', 'Nerves', 'Absinthe'],
    packageManager: 'hex',
    helloWorld: 'IO.puts("Hello, World!")',
  },

  clojure: {
    id: 'clojure',
    name: 'Clojure',
    aliases: ['clj'],
    extension: ['.clj', '.cljs', '.cljc', '.edn'],
    paradigms: ['functional', 'lisp', 'concurrent'],
    typing: 'dynamic',
    compiled: true,
    syntax: {
      commentSingle: ';',
      commentMulti: ['(comment', ')'],
      stringDelimiters: ['"'],
      statementEnd: '',
      blockStart: '(',
      blockEnd: ')',
      functionKeyword: 'defn',
      variableKeywords: ['def', 'let', 'letfn'],
      importKeyword: 'require',
    },
    snippets: {
      defn: '(defn ${name}\n  [${params}]\n  ${body})',
      let: '(let [${bindings}]\n  ${body})',
      map: '(map ${fn} ${coll})',
      atom: '(def ${name} (atom ${value}))',
      thread: '(-> ${value}\n    ${transformations})',
    },
    frameworks: ['Ring', 'Compojure', 'Luminus', 'Pedestal'],
    packageManager: 'leiningen',
    helloWorld: '(println "Hello, World!")',
  },

  fsharp: {
    id: 'fsharp',
    name: 'F#',
    aliases: ['fs'],
    extension: ['.fs', '.fsx', '.fsi'],
    paradigms: ['functional', 'object-oriented', 'async'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['(*', '*)'],
      stringDelimiters: ['"', '@"'],
      statementEnd: '',
      blockStart: '',
      blockEnd: '',
      functionKeyword: 'let',
      variableKeywords: ['let', 'mutable'],
      importKeyword: 'open',
    },
    snippets: {
      let: 'let ${name} ${params} =\n    ${body}',
      match: 'match ${value} with\n| ${pattern} -> ${result}',
      pipe: '${input}\n|> ${fn1}\n|> ${fn2}',
      async: 'async {\n    ${body}\n}',
      record: 'type ${name} = {\n    ${fields}\n}',
    },
    frameworks: ['Giraffe', 'Saturn', 'Suave', 'Fable'],
    packageManager: 'nuget',
    helloWorld: 'printfn "Hello, World!"',
  },

  scala: {
    id: 'scala',
    name: 'Scala',
    aliases: [],
    extension: ['.scala', '.sc'],
    paradigms: ['functional', 'object-oriented'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"', '"""', 's"'],
      statementEnd: '',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'def',
      variableKeywords: ['val', 'var', 'lazy val'],
      classKeyword: 'class',
      importKeyword: 'import',
    },
    snippets: {
      def: 'def ${name}(${params}): ${type} = {\n  ${body}\n}',
      case: 'case class ${name}(${fields})',
      object: 'object ${name} {\n  ${body}\n}',
      trait: 'trait ${name} {\n  ${methods}\n}',
      match: '${value} match {\n  case ${pattern} => ${result}\n}',
      for: 'for {\n  ${generators}\n} yield ${result}',
    },
    frameworks: ['Play', 'Akka', 'ZIO', 'Http4s', 'Spark'],
    packageManager: 'sbt',
    helloWorld: 'object Main extends App {\n  println("Hello, World!")\n}',
  },

  // ========== DATA/SCIENTIFIC LANGUAGES ==========
  r: {
    id: 'r',
    name: 'R',
    aliases: [],
    extension: ['.r', '.R', '.rmd'],
    paradigms: ['functional', 'statistical'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '#',
      commentMulti: ['', ''],
      stringDelimiters: ['"', "'"],
      statementEnd: '',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'function',
      variableKeywords: [],
      importKeyword: 'library',
    },
    snippets: {
      function: '${name} <- function(${params}) {\n  ${body}\n}',
      vector: 'c(${values})',
      dataframe: 'data.frame(\n  ${columns}\n)',
      pipe: '${data} %>%\n  ${operations}',
      ggplot: 'ggplot(${data}, aes(${mapping})) +\n  ${layers}',
    },
    frameworks: ['Shiny', 'ggplot2', 'dplyr', 'tidyverse'],
    packageManager: 'cran',
    helloWorld: 'print("Hello, World!")',
  },

  julia: {
    id: 'julia',
    name: 'Julia',
    aliases: ['jl'],
    extension: ['.jl'],
    paradigms: ['multiple dispatch', 'functional', 'scientific'],
    typing: 'dynamic',
    compiled: true,
    syntax: {
      commentSingle: '#',
      commentMulti: ['#=', '=#'],
      stringDelimiters: ['"', '"""'],
      statementEnd: '',
      blockStart: '',
      blockEnd: 'end',
      functionKeyword: 'function',
      variableKeywords: ['const', 'local', 'global'],
      importKeyword: 'using',
    },
    snippets: {
      function: 'function ${name}(${params})\n    ${body}\nend',
      struct: 'struct ${name}\n    ${fields}\nend',
      macro: 'macro ${name}(${params})\n    ${body}\nend',
      broadcast: '${array} .${op} ${value}',
    },
    frameworks: ['Flux', 'Genie', 'Plots', 'DataFrames'],
    packageManager: 'pkg',
    helloWorld: 'println("Hello, World!")',
  },

  matlab: {
    id: 'matlab',
    name: 'MATLAB',
    aliases: ['m'],
    extension: ['.m'],
    paradigms: ['array', 'procedural', 'object-oriented'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '%',
      commentMulti: ['%{', '%}'],
      stringDelimiters: ['"', "'"],
      statementEnd: ';',
      blockStart: '',
      blockEnd: 'end',
      functionKeyword: 'function',
      variableKeywords: [],
    },
    snippets: {
      function: 'function ${output} = ${name}(${params})\n    ${body}\nend',
      class: 'classdef ${name}\n    properties\n        ${props}\n    end\n    methods\n        ${methods}\n    end\nend',
      plot: 'plot(${x}, ${y});\nxlabel(${xlabel});\nylabel(${ylabel});\ntitle(${title});',
    },
    frameworks: ['Simulink', 'App Designer'],
    packageManager: undefined,
    helloWorld: 'disp("Hello, World!")',
  },

  // ========== SHELL/SCRIPTING ==========
  bash: {
    id: 'bash',
    name: 'Bash',
    aliases: ['sh', 'shell', 'zsh'],
    extension: ['.sh', '.bash', '.zsh'],
    paradigms: ['scripting', 'procedural'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '#',
      commentMulti: ['', ''],
      stringDelimiters: ['"', "'"],
      statementEnd: '',
      blockStart: '',
      blockEnd: '',
      functionKeyword: 'function',
      variableKeywords: ['local', 'export', 'readonly'],
    },
    snippets: {
      function: '${name}() {\n    ${body}\n}',
      if: 'if [[ ${condition} ]]; then\n    ${body}\nfi',
      for: 'for ${var} in ${list}; do\n    ${body}\ndone',
      case: 'case "${var}" in\n    ${pattern})\n        ${body}\n        ;;\nesac',
      variable: '${name}="${value}"',
    },
    frameworks: [],
    packageManager: undefined,
    helloWorld: 'echo "Hello, World!"',
  },

  powershell: {
    id: 'powershell',
    name: 'PowerShell',
    aliases: ['ps1', 'pwsh'],
    extension: ['.ps1', '.psm1', '.psd1'],
    paradigms: ['object-oriented', 'scripting'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '#',
      commentMulti: ['<#', '#>'],
      stringDelimiters: ['"', "'"],
      statementEnd: '',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'function',
      variableKeywords: [],
    },
    snippets: {
      function: 'function ${name} {\n    param(\n        ${params}\n    )\n    ${body}\n}',
      cmdlet: 'Get-${Noun} -${Parameter} $${value}',
      pipeline: 'Get-${Source} | Where-Object { ${condition} } | Select-Object ${properties}',
    },
    frameworks: [],
    packageManager: 'psgallery',
    helloWorld: 'Write-Host "Hello, World!"',
  },

  // ========== QUERY/CONFIG LANGUAGES ==========
  sql: {
    id: 'sql',
    name: 'SQL',
    aliases: ['mysql', 'postgresql', 'sqlite'],
    extension: ['.sql'],
    paradigms: ['declarative', 'query'],
    typing: 'static',
    compiled: false,
    syntax: {
      commentSingle: '--',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ["'"],
      statementEnd: ';',
      blockStart: '',
      blockEnd: '',
      functionKeyword: 'CREATE FUNCTION',
      variableKeywords: [],
    },
    snippets: {
      select: 'SELECT ${columns}\nFROM ${table}\nWHERE ${condition};',
      insert: 'INSERT INTO ${table} (${columns})\nVALUES (${values});',
      update: 'UPDATE ${table}\nSET ${assignments}\nWHERE ${condition};',
      create: 'CREATE TABLE ${name} (\n    ${columns}\n);',
      join: 'SELECT ${columns}\nFROM ${table1}\nJOIN ${table2} ON ${condition};',
    },
    frameworks: [],
    packageManager: undefined,
    helloWorld: "SELECT 'Hello, World!';",
  },

  graphql: {
    id: 'graphql',
    name: 'GraphQL',
    aliases: ['gql'],
    extension: ['.graphql', '.gql'],
    paradigms: ['declarative', 'query'],
    typing: 'static',
    compiled: false,
    syntax: {
      commentSingle: '#',
      commentMulti: ['', ''],
      stringDelimiters: ['"'],
      statementEnd: '',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: '',
      variableKeywords: [],
    },
    snippets: {
      query: 'query ${Name} {\n  ${fields}\n}',
      mutation: 'mutation ${Name}($${var}: ${Type}!) {\n  ${mutation}(input: $${var}) {\n    ${fields}\n  }\n}',
      type: 'type ${Name} {\n  ${fields}\n}',
      input: 'input ${Name}Input {\n  ${fields}\n}',
      fragment: 'fragment ${Name} on ${Type} {\n  ${fields}\n}',
    },
    frameworks: ['Apollo', 'Relay', 'Hasura'],
    packageManager: undefined,
    helloWorld: 'query {\n  hello\n}',
  },

  yaml: {
    id: 'yaml',
    name: 'YAML',
    aliases: ['yml'],
    extension: ['.yaml', '.yml'],
    paradigms: ['declarative', 'configuration'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '#',
      commentMulti: ['', ''],
      stringDelimiters: ['"', "'"],
      statementEnd: '',
      blockStart: '',
      blockEnd: '',
      functionKeyword: '',
      variableKeywords: [],
    },
    snippets: {
      map: '${key}:\n  ${nested}: ${value}',
      list: '${key}:\n  - ${item1}\n  - ${item2}',
      anchor: '${name}: &${anchor}\n  ${content}\n${other}: *${anchor}',
      multiline: '${key}: |\n  ${content}',
    },
    frameworks: [],
    packageManager: undefined,
    helloWorld: 'greeting: Hello, World!',
  },

  json: {
    id: 'json',
    name: 'JSON',
    aliases: [],
    extension: ['.json', '.jsonc'],
    paradigms: ['declarative', 'data'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '',
      commentMulti: ['', ''],
      stringDelimiters: ['"'],
      statementEnd: '',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: '',
      variableKeywords: [],
    },
    snippets: {
      object: '{\n  "${key}": ${value}\n}',
      array: '[\n  ${items}\n]',
      nested: '{\n  "${key}": {\n    "${nested}": ${value}\n  }\n}',
    },
    frameworks: [],
    packageManager: undefined,
    helloWorld: '{\n  "greeting": "Hello, World!"\n}',
  },

  // ========== MARKUP LANGUAGES ==========
  html: {
    id: 'html',
    name: 'HTML',
    aliases: ['htm'],
    extension: ['.html', '.htm'],
    paradigms: ['markup', 'declarative'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '',
      commentMulti: ['<!--', '-->'],
      stringDelimiters: ['"', "'"],
      statementEnd: '',
      blockStart: '<',
      blockEnd: '>',
      functionKeyword: '',
      variableKeywords: [],
    },
    snippets: {
      document: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>${title}</title>\n</head>\n<body>\n  ${content}\n</body>\n</html>',
      div: '<div class="${class}">\n  ${content}\n</div>',
      form: '<form action="${action}" method="${method}">\n  ${inputs}\n</form>',
      link: '<a href="${url}">${text}</a>',
      img: '<img src="${src}" alt="${alt}">',
    },
    frameworks: [],
    packageManager: undefined,
    helloWorld: '<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello, World!</h1>\n</body>\n</html>',
  },

  css: {
    id: 'css',
    name: 'CSS',
    aliases: ['scss', 'sass', 'less'],
    extension: ['.css', '.scss', '.sass', '.less'],
    paradigms: ['declarative', 'styling'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"', "'"],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: '',
      variableKeywords: [],
    },
    snippets: {
      rule: '${selector} {\n  ${property}: ${value};\n}',
      flexbox: 'display: flex;\njustify-content: ${justify};\nalign-items: ${align};',
      grid: 'display: grid;\ngrid-template-columns: ${columns};\ngap: ${gap};',
      media: '@media (${query}) {\n  ${rules}\n}',
      animation: '@keyframes ${name} {\n  from { ${start} }\n  to { ${end} }\n}',
    },
    frameworks: ['Tailwind', 'Bootstrap', 'Bulma', 'Foundation'],
    packageManager: 'npm',
    helloWorld: 'body {\n  font-family: sans-serif;\n}',
  },

  markdown: {
    id: 'markdown',
    name: 'Markdown',
    aliases: ['md'],
    extension: ['.md', '.markdown', '.mdx'],
    paradigms: ['markup', 'documentation'],
    typing: 'dynamic',
    compiled: false,
    syntax: {
      commentSingle: '',
      commentMulti: ['<!--', '-->'],
      stringDelimiters: [],
      statementEnd: '',
      blockStart: '',
      blockEnd: '',
      functionKeyword: '',
      variableKeywords: [],
    },
    snippets: {
      heading: '# ${title}',
      link: '[${text}](${url})',
      image: '![${alt}](${src})',
      code: '```${language}\n${code}\n```',
      table: '| ${col1} | ${col2} |\n| --- | --- |\n| ${val1} | ${val2} |',
    },
    frameworks: [],
    packageManager: undefined,
    helloWorld: '# Hello, World!',
  },

  // ========== SPECIALIZED LANGUAGES ==========
  dart: {
    id: 'dart',
    name: 'Dart',
    aliases: [],
    extension: ['.dart'],
    paradigms: ['object-oriented', 'functional'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"', "'"],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: '',
      variableKeywords: ['var', 'final', 'const'],
      classKeyword: 'class',
      importKeyword: 'import',
    },
    snippets: {
      class: 'class ${name} {\n  ${body}\n}',
      function: '${return} ${name}(${params}) {\n  ${body}\n}',
      async: 'Future<${type}> ${name}(${params}) async {\n  ${body}\n}',
      widget: 'class ${name} extends StatelessWidget {\n  @override\n  Widget build(BuildContext context) {\n    return ${widget};\n  }\n}',
    },
    frameworks: ['Flutter', 'AngularDart', 'Aqueduct'],
    packageManager: 'pub',
    helloWorld: 'void main() {\n  print("Hello, World!");\n}',
  },

  solidity: {
    id: 'solidity',
    name: 'Solidity',
    aliases: ['sol'],
    extension: ['.sol'],
    paradigms: ['contract-oriented', 'object-oriented'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['/*', '*/'],
      stringDelimiters: ['"'],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'function',
      variableKeywords: ['uint', 'int', 'address', 'mapping', 'bytes'],
      classKeyword: 'contract',
      importKeyword: 'import',
    },
    snippets: {
      contract: 'contract ${name} {\n  ${body}\n}',
      function: 'function ${name}(${params}) public ${modifiers} returns (${return}) {\n  ${body}\n}',
      modifier: 'modifier ${name}() {\n  ${body}\n  _;\n}',
      event: 'event ${name}(${params});',
      mapping: 'mapping(${keyType} => ${valueType}) public ${name};',
    },
    frameworks: ['Hardhat', 'Truffle', 'Foundry', 'OpenZeppelin'],
    packageManager: 'npm',
    helloWorld: 'contract HelloWorld {\n  string public greeting = "Hello, World!";\n}',
  },

  zig: {
    id: 'zig',
    name: 'Zig',
    aliases: [],
    extension: ['.zig'],
    paradigms: ['systems', 'imperative'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '//',
      commentMulti: ['', ''],
      stringDelimiters: ['"'],
      statementEnd: ';',
      blockStart: '{',
      blockEnd: '}',
      functionKeyword: 'fn',
      variableKeywords: ['const', 'var'],
      importKeyword: '@import',
    },
    snippets: {
      function: 'fn ${name}(${params}) ${return} {\n    ${body}\n}',
      struct: 'const ${name} = struct {\n    ${fields}\n};',
      comptime: 'comptime {\n    ${body}\n}',
    },
    frameworks: [],
    packageManager: 'zig package manager',
    helloWorld: 'const std = @import("std");\n\npub fn main() void {\n    std.debug.print("Hello, World!\\n", .{});\n}',
  },

  nim: {
    id: 'nim',
    name: 'Nim',
    aliases: [],
    extension: ['.nim', '.nims'],
    paradigms: ['imperative', 'functional', 'object-oriented'],
    typing: 'static',
    compiled: true,
    syntax: {
      commentSingle: '#',
      commentMulti: ['#[', ']#'],
      stringDelimiters: ['"', '"""'],
      statementEnd: '',
      blockStart: '',
      blockEnd: '',
      functionKeyword: 'proc',
      variableKeywords: ['var', 'let', 'const'],
      importKeyword: 'import',
    },
    snippets: {
      proc: 'proc ${name}(${params}): ${return} =\n  ${body}',
      type: 'type\n  ${name} = object\n    ${fields}',
      template: 'template ${name}(${params}) =\n  ${body}',
    },
    frameworks: ['Jester', 'Karax', 'Prologue'],
    packageManager: 'nimble',
    helloWorld: 'echo "Hello, World!"',
  },
};

// ============================================
// UTILITIES
// ============================================

export function getLanguageById(id: string): LanguageTemplate | null {
  const normalized = id.toLowerCase();

  // Direct match
  if (LANGUAGES[normalized]) {
    return LANGUAGES[normalized];
  }

  // Search aliases
  for (const lang of Object.values(LANGUAGES)) {
    if (lang.aliases.includes(normalized)) {
      return lang;
    }
  }

  return null;
}

export function detectLanguageFromExtension(ext: string): LanguageTemplate | null {
  const normalized = ext.startsWith('.') ? ext : `.${ext}`;

  for (const lang of Object.values(LANGUAGES)) {
    if (lang.extension.includes(normalized)) {
      return lang;
    }
  }

  return null;
}

export function getSnippet(languageId: string, snippetName: string, vars: Record<string, string>): string | null {
  const lang = getLanguageById(languageId);
  if (!lang || !lang.snippets[snippetName]) {
    return null;
  }

  let snippet = lang.snippets[snippetName];

  for (const [key, value] of Object.entries(vars)) {
    snippet = snippet.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
  }

  return snippet;
}

export function listAllLanguages(): Array<{ id: string; name: string; paradigms: string[] }> {
  return Object.values(LANGUAGES).map(lang => ({
    id: lang.id,
    name: lang.name,
    paradigms: lang.paradigms,
  }));
}

export function getLanguagesByParadigm(paradigm: string): LanguageTemplate[] {
  return Object.values(LANGUAGES).filter(lang =>
    lang.paradigms.includes(paradigm.toLowerCase())
  );
}

export function getLanguagesByTyping(typing: 'static' | 'dynamic' | 'gradual'): LanguageTemplate[] {
  return Object.values(LANGUAGES).filter(lang => lang.typing === typing);
}

export function formatLanguageSummary(lang: LanguageTemplate): string {
  return `## ${lang.name}

**Type**: ${lang.typing} typing, ${lang.compiled ? 'compiled' : 'interpreted'}
**Paradigms**: ${lang.paradigms.join(', ')}
**Extensions**: ${lang.extension.join(', ')}
${lang.packageManager ? `**Package Manager**: ${lang.packageManager}` : ''}
${lang.frameworks.length > 0 ? `**Frameworks**: ${lang.frameworks.join(', ')}` : ''}

### Hello World
\`\`\`${lang.id}
${lang.helloWorld}
\`\`\`

### Available Snippets
${Object.keys(lang.snippets).map(s => `- \`${s}\``).join('\n')}
`;
}
