/* The maximum number of minutes in a period (a day) */

export const MAX_IN_PERIOD = 1440;
/**
 * PART 1
 *
 * You have an appliance that uses energy, and you want to calculate how
 * much energy it uses over a period of time.
 *
 * As an input to your calculations, you have a series of events that contain
 * a timestamp and the new state (on or off). You are also given the initial
 * state of the appliance. From this information, you will need to calculate
 * the energy use of the appliance i.e. the amount of time it is switched on.
 *
 * The amount of energy it uses is measured in 1-minute intervals over the
 * period of a day. Given there is 1440 minutes in a day (24 * 60), if the
 * appliance was switched on the entire time, its energy usage would be 1440.
 * To simplify calculations, timestamps range from 0 (beginning of the day)
 * to 1439 (last minute of the day).
 *
 * HINT: there is an additional complication with the last two tests that
 * introduce spurious state change events (duplicates at different time periods).
 * Focus on getting these tests working after satisfying the first tests.
 *
 * The structure for `profile` looks like this (as an example):
 * ```
 * {
 *    initial: 'on',
 *    events: [
 *      { state: 'off', timestamp: 50 },
 *      { state: 'on', timestamp: 304 },
 *      { state: 'off', timestamp: 600 },
 *    ]
 * }
 * ```
 */

type ApplianceEvent = {
  timestamp: number;
  state: 'on' | 'off' | 'auto-off';
};

type Profile = {
  initial: 'on' | 'off' | 'auto-off';
  events: ApplianceEvent[];
};

export const calculateEnergyUsageSimple = (profile: Profile): number => {
  //Initialise state
  let energyUsed = 0;
  let currentState = profile.initial;
  let lastTimeStamp = 0;

  //sort events
  const sortedEvents = profile.events.sort((a, b) => a.timestamp - b.timestamp);

  //Add on additional event for full coverage of day
  const events: ApplianceEvent[] = [
    ...sortedEvents,
    {
      state: currentState === 'on' ? 'off' : 'on',
      timestamp: MAX_IN_PERIOD,
    },
  ];

  for (const event of events) {
    const { state, timestamp } = event;

    if (timestamp < 0 || timestamp > MAX_IN_PERIOD) {
      throw new Error(
        `Invalid timestamp: Expected between 0 and ${MAX_IN_PERIOD}, but got ${timestamp}`
      );
    }

    if (currentState === 'on') {
      energyUsed += timestamp - lastTimeStamp;
    }

    currentState = state;
    lastTimeStamp = timestamp;
  }

  return energyUsed;
};

/**
 * PART 2
 *
 * You purchase an energy-saving device for your appliance in order
 * to cut back on its energy usage. The device is smart enough to shut
 * off the appliance after it detects some period of disuse, but you
 * can still switch on or off the appliance as needed.
 *
 * You are keen to find out if your shiny new device was a worthwhile
 * purchase. Its success is measured by calculating the amount of
 * energy *saved* by device.
 *
 * To assist you, you now have a new event type that indicates
 * when the appliance was switched off by the device (as opposed to switched
 * off manually). Your new states are:
 * * 'on'
 * * 'off' (manual switch off)
 * * 'auto-off' (device automatic switch off)
 *
 * (The `profile` structure is the same, except for the new possible
 * value for `initial` and `state`.)
 *
 * Write a function that calculates the *energy savings* due to the
 * periods of time when the device switched off your appliance. You
 * should not include energy saved due to manual switch offs.
 *
 * You will need to account for redundant/non-sensical events e.g.
 * an off event after an auto-off event, which should still count as
 * an energy savings because the original trigger was the device
 * and not manual intervention.
 */

export const calculateEnergySavings = (profile: Profile): number => {
  let energySaved = 0;
  let currentState = profile.initial;
  let lastAutoOffTimestamp = 0;

  // Prepare events: sort and add end-of-day event
  const events = prepareEvents(profile.events, currentState);

  for (const event of events) {
    energySaved += calculateSavingsForEvent(
      currentState,
      lastAutoOffTimestamp,
      event
    );

    if (currentState === 'on' && event.state === 'auto-off') {
      lastAutoOffTimestamp = event.timestamp;
    }

    currentState = determineNewState(currentState, event.state) as
      | 'on'
      | 'off'
      | 'auto-off';
  }

  // Account for energy saved if the final state is 'auto-off'
  if (currentState === 'auto-off') {
    energySaved += MAX_IN_PERIOD - lastAutoOffTimestamp;
  }

  return energySaved;
};

export const prepareEvents = (
  events: ApplianceEvent[],
  initialState: Profile['initial']
): ApplianceEvent[] => {
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  sortedEvents.push({ state: initialState, timestamp: MAX_IN_PERIOD });
  return sortedEvents;
};

export const calculateSavingsForEvent = (
  currentState: string,
  lastAutoOffTimestamp: number,
  event: ApplianceEvent
): number => {
  if (currentState === 'auto-off' && event.state === 'on') {
    return event.timestamp - lastAutoOffTimestamp;
  }
  return 0;
};

export const determineNewState = (
  currentState: string,
  newState: string
): string => {
  const isSignificantChange =
    (currentState === 'on' &&
      (newState === 'off' || newState === 'auto-off')) ||
    (currentState === 'off' && newState === 'on') ||
    (currentState === 'auto-off' && newState === 'on');

  return isSignificantChange ? newState : currentState;
};

/**
 * PART 3
 *
 * The process of producing metrics usually requires handling multiple days of data. The
 * examples so far have produced a calculation assuming the day starts at '0' for a single day.
 *
 * In this exercise, the timestamp field contains the number of minutes since a
 * arbitrary point in time (the "Epoch"). To simplify calculations, assume:
 *  - the Epoch starts at the beginning of the month (i.e. midnight on day 1 is timestamp 0)
 *  - our calendar simply has uniform length 'days' - the first day is '1' and the last day is '365'
 *  - the usage profile data will not extend more than one month
 *
 * Your function should calculate the energy usage over a particular day, given that
 * day's number. It will have access to the usage profile over the month.
 *
 * It should also throw an error if the day value is invalid i.e. if it is out of range
 * or not an integer. Specific error messages are expected - see the tests for details.
 *
 * (The `profile` structure is the same as part 1, but remember that timestamps now extend
 * over multiple days)
 *
 * HINT: You are encouraged to re-use `calculateEnergyUsageSimple` from PART 1 by
 * constructing a usage profile for that day by slicing up and rewriting up the usage profile you have
 * been given for the month.
 */

export const isInteger = (number) => Number.isInteger(number);

export const calculateEnergyUsageForDay = (
  monthUsageProfile: Profile,
  day: number
): number => {
  // Validate day
  if (!isInteger(day)) {
    throw new Error('Day must be an integer');
  }
  if (day < 1 || day > 365) {
    throw new Error('Day out of range');
  }

  const dayStart = (day - 1) * 24 * 60; // Start of the day in minutes
  const dayEnd = day * 24 * 60; // End of the day in minutes

  // Create a new profile for the specific day
  const dayProfile: Profile = {
    initial: monthUsageProfile.initial,
    events: [],
  };

  let lastState = monthUsageProfile.initial;

  // Filter and adjust events for the specific day
  for (const event of monthUsageProfile.events) {
    if (event.timestamp < dayStart) {
      lastState = event.state;
    } else if (event.timestamp <= dayEnd) {
      dayProfile.events.push({
        state: event.state,
        timestamp: event.timestamp - dayStart,
      });
    } else {
      break; // We've passed the day we're interested in
    }
  }

  // Set the initial state for the day
  dayProfile.initial = lastState;

  // Use calculateEnergyUsageSimple to compute the energy usage for the day
  return calculateEnergyUsageSimple(dayProfile);
};
