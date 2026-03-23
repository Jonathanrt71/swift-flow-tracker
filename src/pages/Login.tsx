import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();

  // Don't redirect if the user is meant to go to /reset-password (invite/recovery flow)
  if (session) {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("type=invite")) {
      return <Navigate to={`/reset-password${hash}`} replace />;
    }
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      navigate("/");
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md flex flex-col items-center">
        <h1 className="text-2xl font-semibold text-foreground mb-4">HMC Family Medicine</h1>
        <Card className="w-full bg-card border-border shadow-sm">
          <CardHeader className="text-center pt-12 pb-2 items-center justify-center">
            <CardTitle className="text-xl">Sign in</CardTitle>
          </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 pt-0">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="font-normal text-sm text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="font-normal text-sm text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait…" : "Sign in"}
            </Button>
            <button type="button" onClick={handleForgotPassword} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">Forgot password?</button>
          </CardFooter>
        </form>
      </Card>
      </div>
    </div>);

};

export default Login;