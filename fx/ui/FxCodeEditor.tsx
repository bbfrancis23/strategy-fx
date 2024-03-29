import { TextareaCodeEditorProps } from "@uiw/react-textarea-code-editor"
import dynamic from "next/dynamic"
import "@uiw/react-textarea-code-editor/dist.css" // DO NOT DELTE THIS LINE
const CodeEditor = dynamic(
  () => import("@uiw/react-textarea-code-editor").then((mod) => mod.default),
  {ssr: false}
)


const FxCodeEditor = (props: TextareaCodeEditorProps) => (
  <CodeEditor language="jsx" padding={15}
    {...props}
    style={{ width: '100%',
      fontSize: 12,
      color: '#000000',
      backgroundColor: "#f5f5f5",
      minHeight: '125px',
      fontFamily: "ui-monospace,SF Mono,Consolas,Liberation Mono,Menlo,monospace"
    }}
  />
)

export default FxCodeEditor

// QA Brian Francis 11-03-23