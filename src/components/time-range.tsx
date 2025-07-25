"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function TimeRange() {
  const [timeRange, setTimeRange] = useState("1");
  const router = useRouter();
  const t = useTranslations("timeRange");

  useEffect(() => {
    router.push(`/analytics/?t=${timeRange}`);
  }, [timeRange, router]);

  return (
    <Select value={timeRange} onValueChange={setTimeRange}>
      <SelectTrigger
        className="w-[160px] rounded-lg sm:ml-auto"
        aria-label={t("selectTimeRange")}
      >
        <SelectValue placeholder={t("last3Months")} />
      </SelectTrigger>
      <SelectContent className="rounded-xl">
        <SelectItem value="1" className="rounded-lg">
          {t("lastMonth")}
        </SelectItem>
        <SelectItem value="2" className="rounded-lg">
          {t("last2Months")}
        </SelectItem>
        <SelectItem value="3" className="rounded-lg">
          {t("last3Months")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
