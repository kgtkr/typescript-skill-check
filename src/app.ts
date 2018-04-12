import * as ts from "typescript";
import * as fs from "fs";

const libdts = fs.readFileSync("node_modules/typescript/lib/lib.d.ts", { encoding: "utf8" });

class MyLanguageServiceHost implements ts.LanguageServiceHost {
  files: { [fileName: string]: { file: ts.IScriptSnapshot; ver: number } } = {}

  log() {

  }
  trace() {

  }
  error() {

  }
  getCompilationSettings = ts.getDefaultCompilerOptions;
  getScriptIsOpen() {
    return true;
  }
  getCurrentDirectory() {
    return "";
  }
  getDefaultLibFileName() {
    return "lib.d.ts";
  }

  getScriptVersion(fileName: string) {
    return this.files[fileName].ver.toString();
  }
  getScriptSnapshot(fileName: string) {
    return this.files[fileName].file;
  }

  getScriptFileNames(): string[] {
    var names: string[] = [];
    for (var name in this.files) {
      if (this.files.hasOwnProperty(name)) {
        names.push(name);
      }
    }
    return names;
  }

  addFile(fileName: string, body: string) {
    var snap = ts.ScriptSnapshot.fromString(body);
    snap.getChangeRange = _ => undefined;
    var existing = this.files[fileName];
    if (existing) {
      this.files[fileName].ver++;
      this.files[fileName].file = snap
    } else {
      this.files[fileName] = { ver: 1, file: snap };
    }
  }
}

class MyCompilerHost extends MyLanguageServiceHost implements ts.CompilerHost {
  getSourceFile(filename: string, languageVersion: ts.ScriptTarget, onError?: (message: string) => void) {
    var f = this.files[filename];
    if (!f) {
      return undefined;
    }
    var sourceFile = ts.createLanguageServiceSourceFile(filename, f.file, ts.ScriptTarget.ES5, f.ver.toString(), true);
    return sourceFile;
  }
  readFile(path: string) {
    return this.files[path].file.getText(0, this.files[path].file.getLength() - 1);
  }
  writeFile(filename: string, data: string, writeByteOrderMark: boolean, onError?: (message: string) => void): void {
  }
  getCanonicalFileName(fileName: string) {
    return fileName;
  }
  useCaseSensitiveFileNames() {
    return true;
  }
  getNewLine() {
    return "\n";
  }
  getDirectories() {
    return Object.keys(this.files);
  }
  fileExists(fileName: string) {
    return this.files[fileName] !== undefined;
  }
}

function serializeType(type: ts.Type) {
  switch (type.getFlags()) {
    case ts.TypeFlags.Any:
      return { type: "any" };
    case ts.TypeFlags.String:
      return { type: "string" };
    case ts.TypeFlags.Number:
      return { type: "number" };
    case ts.TypeFlags.Boolean:
      return { type: "boolean" };
    case ts.TypeFlags.Enum:
      break;
    case ts.TypeFlags.StringLiteral:
      break;
    case ts.TypeFlags.NumberLiteral:
      break;
    case ts.TypeFlags.BooleanLiteral:
      break;
    case ts.TypeFlags.EnumLiteral:
      break;
    case ts.TypeFlags.ESSymbol:
      return { type: "symbol" };
    case ts.TypeFlags.UniqueESSymbol:
      break;
    case ts.TypeFlags.Void:
      return { type: "void" };
    case ts.TypeFlags.Undefined:
      return { type: "undefined" };
    case ts.TypeFlags.Null:
      return { type: "null" };
    case ts.TypeFlags.TypeParameter:
      break;
    case ts.TypeFlags.Object:
      break;
    case ts.TypeFlags.Union:
      return { type: "union", types: type.getProperties() };
    case ts.TypeFlags.Intersection:
      break;
    case ts.TypeFlags.Index:
      break;
    case ts.TypeFlags.IndexedAccess:
      break;
    case ts.TypeFlags.NonPrimitive:
      break;
    case ts.TypeFlags.MarkerType:
      break;
    case ts.TypeFlags.Literal:
      break;
    case ts.TypeFlags.Unit:
      break;
    case ts.TypeFlags.StringOrNumberLiteral:
      break;
    case ts.TypeFlags.PossiblyFalsy:
      break;
    case ts.TypeFlags.StringLike:
      break;
    case ts.TypeFlags.NumberLike:
      break;
    case ts.TypeFlags.BooleanLike:
      break;
    case ts.TypeFlags.EnumLike:
      break;
    case ts.TypeFlags.ESSymbolLike:
      break;
    case ts.TypeFlags.UnionOrIntersection:
      break;
    case ts.TypeFlags.StructuredType:
      break;
    case ts.TypeFlags.StructuredOrTypeVariable:
      break;
    case ts.TypeFlags.TypeVariable:
      break;
    case ts.TypeFlags.Narrowable:
      break;
    case ts.TypeFlags.NotUnionOrUnit:
      break;
    default:
      throw new Error("未知の型");
  }
}


//const source = "type Main<T>=T;";
const source = "type Main=string?;";
const host = new MyCompilerHost();
host.addFile("lib.d.ts", libdts);
host.addFile("main.ts", source);
const program = ts.createProgram(["main.ts"], { strict: true }, host);
const checker = program.getTypeChecker();

// Visit every sourceFile in the program
for (const sourceFile of program.getSourceFiles()) {
  if (!sourceFile.isDeclarationFile) {
    // Walk the tree to search for classes
    ts.forEachChild(sourceFile, node => {
      if (ts.isTypeAliasDeclaration(node) && node.name) {
        let symbol = checker.getSymbolAtLocation(node.name)!;
        const type = checker.getDeclaredTypeOfSymbol(symbol);
        console.log({
          name: symbol.getName(),
          flag: ts.TypeFlags[type.getFlags()],
          type: type.getProperties()
        });
      }
    });
  }
}


