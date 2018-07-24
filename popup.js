Config.withInferredConfig((config) => {
  const API_URL = config.get("origin") + '/rest';

  let data = Bind({
    filterQuery: config.get("filterQuery")
  }, {
    filterQuery: {
      dom: '#filter-query',
      callback: (value) => {
        config.set("filterQuery", value);
        config.save(config);
      }
    }
  });

  function workdayCount(start, end) {
    var startDateMoment = moment(start);
    var endDateMoment = moment(end);
    var days = Math.round(-startDateMoment.diff(endDateMoment, 'days') + startDateMoment.diff(endDateMoment, 'days') / 7 * 2);
    if (endDateMoment.day() === 6) {
      days--;
    }
    if (startDateMoment.day() === 0) {
      days--;
    }
    return days + 1;
  }

  let jiraClient = new JiraClient(API_URL);
  let jql = `${config.get("filterQuery")} AND issuetype not in subTaskIssueTypes() and resolutiondate > -6w order by resolutiondate desc`;

  jiraClient.search(jql).then((issues) => {
    let workDone = _.chain(issues)
      .map((issue) => {
        return _.pick(issue, ['key', 'fields', 'changelog']);
      }).map((issue) => {
        issue.statusChanges = getStatusChanges(issue);
        issue.workPeriods = getWorkPeriods(issue);
        issue.timeInProgress = getTimeInProgress(issue);
        return issue;
      }).filter((issue) => {
        return issue.timeInProgress > 0;
      }).each((issue) => {
        issue.storyPoints = issue.fields.customfield_10006 || 1;
        issue.workPerDayInProgress = issue.storyPoints / issue.timeInProgress;
      }).value();

    let periodEnd = moment();
    let periodStart = moment().subtract(8, 'weeks');
    let currentDay = periodStart;

    let workDonePerWeek = {};

    for(let currentDay = periodStart; currentDay <= periodEnd; currentDay.add(1, 'days')) {
      if(currentDay.day() == 0 || currentDay.day() == 6) {
        continue;
      }

      let issuesWorkedOn = [];
      let workForCurrentDay = _.reduce(workDone, (sum, issue) => {
        let workedAtCurrentDay = _.chain(issue.workPeriods)
          .map((workPeriod) => {
            return currentDay.isBetween(workPeriod.start, workPeriod.end);
          }).some().value();
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

    console.log(workDonePerWeek);
  });

  function historyWasInProgress(history) {
    return _.chain(history.items)
      .map((item) => {
        return item.field == 'status' && (item.fromString == 'In Progress' || item.toString == 'In Progress');
      }).some().value();
  }

  function statusChangesOnly(statusChange) {
    statusChange.items = _.filter(statusChange.items, (item) => {
      return item.field == 'status';
    });
    return statusChange;
  }

  function getStatusChanges(issue) {
    return _.chain(issue.changelog.histories)
      .filter(historyWasInProgress)
      .map(statusChangesOnly)
      .map((statusChange) => {
        return {
          date: statusChange.created,
          from: statusChange.items[0].fromString,
          to: statusChange.items[0].toString
        };
      })
      .value();
  }

  function getWorkPeriods(issue) {
    return _.reduce(issue.statusChanges, (periods, statusChange) => {
      date = moment(statusChange.date);
      if(statusChange.to == 'In Progress') {
        workPeriod = { start: date.startOf('day') };
      } else {
        workPeriod.end = date.startOf('day');
        periods.push(workPeriod);
      }
      return periods;
    }, []);
  }

  function getTimeInProgress(issue) {
    let workPeriodStart = null;
    return _.reduce(issue.workPeriods, (sum, workPeriod) => {
      sum += workdayCount(workPeriod.start, workPeriod.end);
      return sum;
    }, 0);
  }
});
