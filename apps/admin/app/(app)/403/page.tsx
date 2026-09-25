import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-3xl border-0 text-center shadow-sm ring-1 ring-border/60 [--card-spacing:--spacing(6)]">
        <CardHeader className="items-center">
          <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldOff className="size-7" aria-hidden />
          </div>
          <CardTitle className="text-xl font-semibold">Accès refusé</CardTitle>
          <CardDescription>
            Vous n’avez pas les permissions nécessaires pour consulter cette
            page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            render={<Link href="/dashboard" />}
            className="h-10 rounded-xl px-5"
          >
            Retour au tableau de bord
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
