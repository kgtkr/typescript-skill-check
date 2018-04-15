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

type Type =
  | AnyType
  | StringType
  | NumberType
  | BooleanType
  | StringLiteralType
  | NumberLiteralType
  | BooleanLiteralType
  | SymbolType
  | VoidType
  | UndefinedType
  | NullType
  | ObjectType
  | UnionType
  | IntersectionType
  | NeverType;
type AnyType = { type: "any" };
type StringType = { type: "string" };
type NumberType = { type: "number" };
type BooleanType = { type: "boolean" };
type StringLiteralType = { type: "string-literal", value: string };
type NumberLiteralType = { type: "number-literal", value: number };
type BooleanLiteralType = { type: "boolean-literal", value: boolean };
type SymbolType = { type: "symbol" };
type VoidType = { type: "void" };
type UndefinedType = { type: "undefined" };
type NullType = { type: "null" };
type ObjectType = { type: "object", members: { key: string, type: Type }[] };
type UnionType = { type: "union", types: Type[] };
type IntersectionType = { type: "intersection", types: Type[] };
type NeverType = { type: "never" };

function serializeType(type: ts.Type, count: number): Type {
  if (count > 1024) {
    throw new Error("型のネストが深すぎます");
  }
  switch (type.getFlags()) {
    case ts.TypeFlags.Any:
      return { type: "any" };
    case ts.TypeFlags.String:
      return { type: "string" };
    case ts.TypeFlags.Number:
      return { type: "number" };
    case ts.TypeFlags.Boolean:
      return { type: "boolean" };
    case ts.TypeFlags.StringLiteral:
      return { type: "string-literal", value: (type as ts.StringLiteralType).value };
    case ts.TypeFlags.NumberLiteral:
      return { type: "number-literal", value: (type as ts.NumberLiteralType).value };
    case ts.TypeFlags.BooleanLiteral:
      return { type: "boolean-literal", value: (type as any).intrinsicName === "true" };
    case ts.TypeFlags.ESSymbol:
      return { type: "symbol" };
    case ts.TypeFlags.Void:
      return { type: "void" };
    case ts.TypeFlags.Undefined:
      return { type: "undefined" };
    case ts.TypeFlags.Null:
      return { type: "null" };
    case ts.TypeFlags.Object:
      const a = type.symbol!.members!;
      return {
        type: "object",
        members: Array.from(type.symbol!.members!.entries() as any as Iterable<[string, ts.Symbol]>)
          .map<[string, any]>(([key, s]) => [key, serializeType(checker.getTypeOfSymbolAtLocation(s, s.valueDeclaration!), count + 1)])
          .map(([key, type]) => ({ key, type }))
      };
    case ts.TypeFlags.Union:
      return { type: "union", types: (type as ts.UnionType).types.map(x => serializeType(x, count + 1)) };
    case ts.TypeFlags.Intersection:
      return { type: "intersection", types: (type as ts.UnionType).types.map(x => serializeType(x, count + 1)) };
    case ts.TypeFlags.Never:
      return { type: "never" };
    default:
      throw new Error("未対応の型");
  }
}


const source = "type Main={x:{x:number}}";
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
        console.log(JSON.stringify(serializeType(type, 0), undefined, 2));
      }
    });
  }
}