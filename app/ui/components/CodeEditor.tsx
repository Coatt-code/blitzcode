"use client";

import { saveCode } from "@/app/actions";
import { useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { useState } from "react";

export default function CodeEditor () {
  const codeRef = useRef(`# write python here\nprint("hello world")`);
  const [textOutput, setTextOutput] = useState("");
  const [errorOutput, setErrorOutput] = useState("");
  async function handleSubmit (code: string) {
    const s = await saveCode(code)
    setTextOutput(s.stdout)
    setErrorOutput(s.error)
    console.log(s.error)
  }

  return (
    <>
    <CodeMirror
        value={codeRef.current}
        height="200px"
        theme={oneDark}
        extensions={[python()]}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          foldGutter: true,
        }}
        onChange={(value) => {
          codeRef.current = value;
        }}
    />
    <div className="flex w-full mt-6 justify-center">
      <button className="p-2 px-3 bg-neutral-800 rounded-lg cursor-pointer hover:bg-neutral-700"  onClick={() => handleSubmit(codeRef.current)}>
        Submit
      </button>
    </div>
    <p>Output:</p>
    <pre>
      {textOutput}
    </pre>
    <p>Errors:</p>
    <pre>
      
      {errorOutput}
    </pre>
    
    </>);
}