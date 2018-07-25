class WorkloadService {
  constructor(issues) {
    this.issues = issues;
  }

  storyPointsPerWeek() {
    let periodEnd = moment();
    let periodStart = moment().subtract(8, 'weeks');
    let currentDay = periodStart;

    let workDonePerWeek = {};

    for(let currentDay = periodStart; currentDay <= periodEnd; currentDay.add(1, 'days')) {
      if(currentDay.day() == 0 || currentDay.day() == 6) {
        continue;
      }

      let issuesWorkedOn = [];
      let workForCurrentDay = _.reduce(this.issues, (sum, issue) => {
        let workedAtCurrentDay = _.reduce(issue.workPeriods, (worked, workPeriod) => {
          return worked || currentDay.isBetween(workPeriod.start, workPeriod.end);
        }, false);

        if(workedAtCurrentDay) {
          sum += issue.workPerDayInProgress;
          issuesWorkedOn.push(issue.key);
        }
        return sum;
      }, 0);

      let calendarWeek = currentDay.week();
      if(!workDonePerWeek[calendarWeek]) {
        workDonePerWeek[calendarWeek] = { work: 0, issues: [] };
      }
      workDonePerWeek[calendarWeek].work += workForCurrentDay;
      workDonePerWeek[calendarWeek].issues = _.uniq(workDonePerWeek[calendarWeek].issues.concat(issuesWorkedOn));
    }

    return workDonePerWeek;
  }
}
