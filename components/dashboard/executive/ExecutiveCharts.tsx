import AttendanceChart, { type AttendanceChartItem } from "../charts/AttendanceChart";
import GradeChart from "../charts/GradeChart";
import BehaviorChart from "../charts/BehaviorChart";

type ExecutiveChartsProps = {
  attendance: AttendanceChartItem[];
  averageScore: number;
  behaviorNotes: number;
};

export default function ExecutiveCharts({
  attendance,
  averageScore,
  behaviorNotes,
}: ExecutiveChartsProps) {
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <AttendanceChart data={attendance} />
      </div>
      <div className="grid gap-4">
        <GradeChart averageScore={averageScore} />
        <BehaviorChart behaviorNotes={behaviorNotes} />
      </div>
    </section>
  );
}
