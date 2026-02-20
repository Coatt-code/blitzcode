import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"


export default function Page () {

    return (<>
    <div className="pt-10 px-4 grid w-full gap-2 md:max-w-sm">
        <Input placeholder="Enter nickname"></Input>
        <Button variant="secondary">Start</Button>
    </div>
    </>)
}