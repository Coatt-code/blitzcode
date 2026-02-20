"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button";
import { useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import OutputDisplay from "@/components/ui/output-display";
import { AppWindowIcon, CodeIcon, SquareTerminal } from "lucide-react"
import { ThemeSwitcher } from "@/components/ui/theme-switcher";


export default function Home() {
  const codePlaceholder = "# write Python code here\nprint('Hello, World!')"
  const [code, setCode] = useState(codePlaceholder);
  const [resData, setResData] = useState();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("editor");

  async function submitCode () {
      setTab("output")
      setLoading(true);
      const res = await fetch("/api/send_code", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ code: code }),
      })
      const data = await res.json()
      setResData(data);
      setLoading(false);
      console.log(data)
  }
  return (
    <div className="w-screen h-full flex">
      <Tabs className="items-center justify-center flex h-full w-full pt-2" value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="problem"><AppWindowIcon />Problem</TabsTrigger>
          <TabsTrigger value="editor"><CodeIcon />Code</TabsTrigger>
          <TabsTrigger value="output"><SquareTerminal />Output</TabsTrigger>
        </TabsList>
        <TabsContent value="problem"></TabsContent>
        <TabsContent value="editor" className="h-full w-full">
          <CodeMirror
            className="w-full h-full flex-1"
            value={code}
            onChange={(value) => setCode(value)}
            theme={oneDark}
            extensions={[python()]}
            basicSetup={{
              lineNumbers: true,
              highlightActiveLine: true,
              foldGutter: true,}}
          />
        </TabsContent>
        <TabsContent value="output">
          <OutputDisplay result={resData} loading={loading}/>
        </TabsContent>
      </Tabs>
      <Button variant="outline" className="fixed bottom-5 right-6" onClick={submitCode}>Submit</Button>
      {/*<ThemeSwitcher />*/}
    </div>
    );
}
