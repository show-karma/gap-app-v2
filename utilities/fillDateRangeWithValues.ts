import moment from "moment"

interface DataType {
  value: string | number
  date: string
  timestamp: number
}

interface ReturnType {
  value: string | number
  date: string
}

export const fillDateRangeWithValues = (dataArray: DataType[]) => {
  const filledArray: ReturnType[] = []
  const localDataArray = dataArray.map((data) => ({
    ...data,
    timestamp: moment(data.timestamp).utc().startOf("date").valueOf(),
  }))
  const firstDayOfRange = moment
    .min(localDataArray.map((data) => moment(data.timestamp)))
    .startOf("day")

  const currentDate = moment(firstDayOfRange).utc().startOf("date")
  const lastDayOfRange = moment().utc().startOf("date")

  while (currentDate <= lastDayOfRange) {
    const matchingData = localDataArray.find((data) => {
      return moment(data.timestamp).isSame(currentDate, "day")
    })
    if (matchingData) {
      filledArray.push({
        date: moment(matchingData.timestamp).utc().startOf("date").toISOString(),
        value: matchingData.value,
      })
    } else {
      const currentDateManipulated = currentDate.utc().startOf("date") // Set time to 00:00:00
      filledArray.push({
        date: currentDateManipulated.toISOString(),
        value: 0,
      })
    }
    currentDate.add(1, "day")
  }

  return filledArray
}
