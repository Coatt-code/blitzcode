"use client";

import { useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { useState } from "react";

async function sendCode(code: string) {
  const res = await fetch("api/send_code", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ code: code }),
  })
  const data = await res.json()
  console.log(data)
}

async function handleSubmit (code: string) {
    const res = await sendCode(code) 
  }
export default function CodeEditor () {
  const codeRef = useRef(`# write python here\nprint("hello world")`);
  
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
    </>);
}