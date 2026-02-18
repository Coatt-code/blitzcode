import { exec } from "child_process"

export async function send_code(code: string) {
  const output = await new Promise ((resolve) => {
    exec(code)
    exec("python code.py", (error,stdout,stderr) => {
      if (error) {
        let er = error.message
        er = er.replace(`"/home/coatt/Documents/vercel_prac/Mini/code/code.py",`, "")
        er = er.replace(`Command failed: python code.py`, "")
        er = er.replace(`File`, "")

        
        resolve({error: er})
        return
      }
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      })
    })
  })
  //await new Promise(r => setTimeout(r, 5000));
  return Response.json(output);
}

