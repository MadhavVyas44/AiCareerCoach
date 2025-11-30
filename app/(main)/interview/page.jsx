import { getAssessment } from "@/actions/interview";
import React from "react";
import StatsCards from "./components/stats-cards";
import PerformanceChart from "./components/performance-chart";
import QuizList from "./components/quiz-list";

const interviewPage = async () => {
  const assessments = await getAssessment();
  return (
    <div>
      <div className="">
        <h1 className="text-6xl font-bold gradient-title mb-5">
          Interview Preparation
        </h1>

        <div>
          <StatsCards assessments={assessments} />
          <PerformanceChart assessments={assessments} />
          <QuizList assessments={assessments} />
        </div>
      </div>
    </div>
  );
};

export default interviewPage;
