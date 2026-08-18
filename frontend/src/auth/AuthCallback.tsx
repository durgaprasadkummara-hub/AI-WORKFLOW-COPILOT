import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "./AuthService";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        await authService.handleCallback();
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Auth callback failed", err);
        navigate("/", { replace: true });
      }
    })();
  }, [navigate]);

  return <div>Completing sign-in...</div>;
}
