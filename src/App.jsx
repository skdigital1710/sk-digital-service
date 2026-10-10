import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Bell, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronLeft,
  ChevronRight, Clock3, Copy, ExternalLink, FileText, Flame, Globe2, GraduationCap,
  Grid3x3, IndianRupee, Instagram, Landmark, Link2, MapPin, Menu, MessageCircle,
  Moon, Search, Send, Share2, ShieldCheck, Sparkles, Star, Sun, TrainFront, Users,
  WalletCards, X, Youtube, Zap
} from "lucide-react";
import { supabase } from "./lib/supabase";
import "./App.css";
import "./AppDetailExact.css";
import SocialFollowGate, { useSocialFollowGate } from "./SocialFollowGate";

const WA_FALLBACK =
  "https://whatsapp.com/channel/0029Vb6H3cS1SWsyxdVo471w";

const IG_FALLBACK =
  "https://instagram.com/skdigitalservice.dhule";

const YT_FALLBACK =
  "https://youtube.com/@skdigitalservice-t9u";

const EBOOK_URL =
  "https://qsaim.gumroad.com/l/ai-career-system";

const JOB_CATS = [
  ["Latest Jobs", "latest", Flame, "#ff7a00"],
  ["SSC", "ssc", GraduationCap, "#0b63d6"],
  ["Railway", "railway", TrainFront, "#0b63d6"],
  ["Banking", "banking", Landmark, "#0b3f7a"],
  ["Defence", "defence", ShieldCheck, "#e5384a"],
  ["Police", "police", Star, "#1c4fa8"],
  ["Teaching", "teaching", GraduationCap, "#0b8a57"],
  ["Other", "other", Grid3x3, "#5b6b82"]
];

function safeUrl(v) {
  try {
    const u = new URL(String(v || "").trim());

    return ["http:", "https:"].includes(u.protocol)
      ? u.toString()
      : "";
  } catch {
    return "";
  }
}

function dateText(v) {
  if (!v) return "—";

  const d = new Date(`${v}T00:00:00`);

  return Number.isNaN(d.getTime())
    ? v
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });
}

function daysLeft(v) {
  if (!v) return null;

  const end = new Date(`${v}T23:59:59`);

  return Math.ceil(
    (end - Date.now()) / 86400000
  );
}

function deadline(v) {
  const d = daysLeft(v);

  if (d === null) {
    return {
      text: "Check Notification",
      tone: "neutral"
    };
  }

  if (d < 0) {
    return {
      text: "Application Closed",
      tone: "closed"
    };
  }

  if (d <= 3) {
    return {
      text: `Only ${d} Day${d === 1 ? "" : "s"} Left`,
      tone: "urgent"
    };
  }
