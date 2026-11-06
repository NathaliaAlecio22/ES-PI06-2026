import { useState, type FormEvent } from "react";

import {
  Blocks,
  ArrowLeft,
  ArrowRight,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  KeyRound,
  RefreshCw,
} from "lucide-react";

type Step = 1 | 2 | 3 | 4;

interface ForgotPassword {
    onBackToLogin: () => void;
}

export default function ForgotPassword() {
    return (
        <>FORGOYT PASSWORD</>
    )
}