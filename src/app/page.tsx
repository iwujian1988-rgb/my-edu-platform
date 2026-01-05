import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-gray-900">
            Little Language Notes
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            让英语学习更高效
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <Button size="lg" className="w-full text-lg">
            Start Learning
          </Button>
          <p className="text-sm font-semibold" style={{ color: "rgb(99, 102, 241)" }}>
            v3.2.1
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
