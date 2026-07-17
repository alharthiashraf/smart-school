import AttendanceChart, {
  type AttendanceChartItem,
} from "../charts/AttendanceChart";
import BehaviorChart from "../charts/BehaviorChart";
import GradeChart from "../charts/GradeChart";

export type ExecutiveChartsProps = {
  attendance: AttendanceChartItem[];
  averageScore: number;
  behaviorNotes: number;
  className?: string;
};

export default function ExecutiveCharts({
  attendance,
  averageScore,
  behaviorNotes,
  className = "",
}: ExecutiveChartsProps) {
  return (
    <section
      className={[
        "grid grid-cols-1 gap-4 xl:grid-cols-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0 xl:col-span-2">
        <AttendanceChart
          data={attendance}
          className="h-full"
        />
      </div>

      <div className="grid min-w-0 gap-4">
        <GradeChart
          averageScore={averageScore}
          className="h-full"
        />

        <BehaviorChart
          behaviorNotes={behaviorNotes}
          className="h-full"
        />
      </div>
    </section>
  );
}