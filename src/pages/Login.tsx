import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();

  if (session) {
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
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden" }}>
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(/login-bg.jpg)",
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "blur(3px) brightness(0.8)",
        transform: "scale(1.05)",
      }} />
      <div style={{
        position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", padding: 24,
      }}>
        <div className="w-full flex flex-col items-center" style={{ maxWidth: 340 }}>
          <Card className="w-full border-0" style={{
            background: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: 16,
            boxShadow: "0 12px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.2)",
          }}>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4" style={{ padding: "24px 24px 8px" }}>
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
              <CardFooter className="flex flex-col" style={{ padding: "8px 24px 24px" }}>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Please wait…" : "Sign in"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>);

};

export default Login;