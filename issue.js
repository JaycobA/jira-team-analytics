class Issue {
  constructor(key, fields, changelog, storyPoints) {
    this.key = key;
    this.fields = fields;
    this.changelog = changelog;
    this.statusChanges = this.getStatusChanges();
    this.workPeriods = this.getWorkPeriods();
    this.timeInProgress = this.getTimeInProgress();
    this.storyPoints = storyPoints;
    this.workPerDayInProgress = this.storyPoints / this.timeInProgress;
  }

  static fromApiResult(apiIssue, defaultStoryPoints) {
    return new Issue(apiIssue.key, apiIssue.fields, apiIssue.changelog, apiIssue.fields.customfield_10006 || defaultStoryPoints);
  }

  getStatusChanges() {
    return _.chain(this.changelog.histories)
      .filter(this.historyWasInProgress)
      .map(this.statusChangesOnly)
      .map((statusChange) => {
        return {
          date: statusChange.created,
          from: statusChange.items[0].fromString,
          to: statusChange.items[0].toString
        };
      })
      .value();
  }

  getWorkPeriods() {
    let workPeriod;
    return _.reduce(this.statusChanges, (periods, statusChange) => {
      let date = moment(statusChange.date);

      if(statusChange.to == 'In Progress') {
        workPeriod = { start: date.startOf('day') };
      } else {
        workPeriod.end = date.startOf('day');
        periods.push(workPeriod);
      }
      return periods;
    }, []);
  }

  getTimeInProgress() {
    let workPeriodStart = null;
    return _.reduce(this.workPeriods, (sum, workPeriod) => {
      sum += this.workdayCount(workPeriod.start, workPeriod.end);
      return sum;
    }, 0);
  }

  historyWasInProgress(history) {
    return _.chain(history.items)
      .map((item) => {
        return item.field == 'status' && (item.fromString == 'In Progress' || item.toString == 'In Progress');
      }).some().value();
  }

  statusChangesOnly(statusChange) {
    statusChange.items = _.filter(statusChange.items, (item) => {
      return item.field == 'status';
    });
    return statusChange;
  }

  workdayCount(start, end) {
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
}
