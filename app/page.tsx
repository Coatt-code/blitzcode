import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Item } from "@/components/ui/item";
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react";
import { neon } from '@neondatabase/serverless';

export default function Page () {
  async function create(formData: FormData) {
    'use server';
    // Connect to the Neon database
    const sql = neon(`${process.env.DATABASE_URL}`);
    const comment = formData.get('comment');
    // Insert the comment from the form into the Postgres database
    await sql.query('INSERT INTO comments (comment) VALUES ($1)', [comment]);
  }
  return (<>
    <div className="h-40"></div>
    <form action={create}>
      <input type="text" placeholder="write a comment" name="comment" />
      <button type="submit">Submit</button>
    </form>

    <div className="mx-2">
      <Item variant="outline">
        <Table>
          <TableCaption>A list of problems to solve.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="text-left">Problem No.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="text-left">1</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="icon" className="">
                  <Link href="/problem/1"><ChevronRight /></Link>
                </Button>
            </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Item>
    </div>

  </>);
}