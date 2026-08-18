import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "./AuthService";

export default function SignoutCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        await authService.handleSignoutCallback();
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Signout callback failed", err);
        navigate("/", { replace: true });
      }
    })();
  }, [navigate]);

  return <div>Signing out...</div>;
}
