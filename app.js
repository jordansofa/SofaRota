import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import moment from 'moment';

const COLORS = {
  jordan: '#b8d9f0',
  iryna: '#f5c6d4',
  holiday: '#fef08a',
  error: '#ef4444',
  bg: '#f8f7f5',
  surface: '#ffffff',
  text: '#1a1815',
  muted: '#8a8580',
  border: '#e5e2dc',
};

const STORAGE_KEY = '@RotaData_';

export default function App() {
  const [currentMonth, setCurrentMonth] = useState(moment().startOf('month'));
  const [rotaData, setRotaData] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDate, setEditingDate] = useState(null);

  // Form state
  const [selectedPerson, setSelectedPerson] = useState(null); // 'jordan', 'iryna', 'holiday'
  const [jStart, setJStart] = useState(null);
  const [jEnd, setJEnd] = useState(null);
  const [jBreak, setJBreak] = useState(30);
  const [iStart, setIStart] = useState(null);
  const [iEnd, setIEnd] = useState(null);
  const [iBreak, setIBreak] = useState(30);
  const [holidayWho, setHolidayWho] = useState('both');

  useEffect(() => {
    loadMonthData();
  }, [currentMonth]);

  const getStorageKey = () => {
    return STORAGE_KEY + currentMonth.format('YYYY_MM');
  };

  const loadMonthData = async () => {
    try {
      const json = await AsyncStorage.getItem(getStorageKey());
      if (json) {
        setRotaData(JSON.parse(json));
      } else {
        setRotaData({});
      }
    } catch (e) {
      console.error('Load failed', e);
    }
  };

  const saveMonthData = async (data) => {
    setRotaData(data);
    try {
      await AsyncStorage.setItem(getStorageKey(), JSON.stringify(data));
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  const getDateKey = (date) => date.format('YYYY-MM-DD');

  const openEditModal = (date) => {
    setEditingDate(date);
    const key = getDateKey(date);
    const entry = rotaData[key] || {};

    if (entry.type === 'holiday') {
      setSelectedPerson('holiday');
      setHolidayWho(entry.holiday?.person || 'both');
    } else {
      setSelectedPerson(null);
      setJStart(entry.jordan?.start ? moment(`${key} ${entry.jordan.start}`, 'YYYY-MM-DD HH:mm') : null);
      setJEnd(entry.jordan?.end ? moment(`${key} ${entry.jordan.end}`, 'YYYY-MM-DD HH:mm') : null);
      setJBreak(entry.jordan?.breakMins || 30);
      setIStart(entry.iryna?.start ? moment(`${key} ${entry.iryna.start}`, 'YYYY-MM-DD HH:mm') : null);
      setIEnd(entry.iryna?.end ? moment(`${key} ${entry.iryna.end}`, 'YYYY-MM-DD HH:mm') : null);
      setIBreak(entry.iryna?.breakMins || 30);
    }

    setModalVisible(true);
  };

  const calcHours = (start, end, brk = 0) => {
    if (!start || !end) return 0;
    const diff = moment(end).diff(moment(start), 'minutes') - Number(brk);
    return Math.max(0, diff / 60);
  };

  const saveDay = () => {
    if (!editingDate) return;
    const key = getDateKey(editingDate);
    let newData = { ...rotaData };

    if (selectedPerson === 'holiday') {
      newData[key] = {
        type: 'holiday',
        holiday: { person: holidayWho },
      };
    } else {
      const entry = {};
      let hasShift = false;

      if (jStart && jEnd) {
        entry.jordan = {
          start: moment(jStart).format('HH:mm'),
          end: moment(jEnd).format('HH:mm'),
          breakMins: Number(jBreak),
        };
        hasShift = true;
      }
      if (iStart && iEnd) {
        entry.iryna = {
          start: moment(iStart).format('HH:mm'),
          end: moment(iEnd).format('HH:mm'),
          breakMins: Number(iBreak),
        };
        hasShift = true;
      }

      if (hasShift) {
        newData[key] = entry;
      } else if (newData[key]) {
        delete newData[key];
      }
    }

    saveMonthData(newData);
    setModalVisible(false);
  };

  const clearDay = () => {
    if (!editingDate) return;
    const key = getDateKey(editingDate);
    let newData = { ...rotaData };
    delete newData[key];
    saveMonthData(newData);
    setModalVisible(false);
  };

  const changeMonth = (delta) => {
    setCurrentMonth(currentMonth.clone().add(delta, 'months'));
  };

  const renderDay = (date, inMonth) => {
    if (!inMonth) return <View style={[styles.dayCell, styles.otherMonth]} />;

    const key = getDateKey(date);
    const entry = rotaData[key];
    let bgColor = null;

    if (entry) {
      if (entry.type === 'holiday') {
        bgColor = COLORS.holiday;
      } else {
        const hasJ = !!entry.jordan;
        const hasI = !!entry.iryna;
        if (hasJ && hasI) bgColor = '#d4b8e6'; // purple-ish mix (gradient not trivial in RN)
        else if (hasJ) bgColor = COLORS.jordan;
        else if (hasI) bgColor = COLORS.iryna;
      }
    }

    return (
      <TouchableOpacity
        style={[styles.dayCell, bgColor && { backgroundColor: bgColor }]}
        onPress={() => openEditModal(date)}
      >
        <Text style={styles.dayNumber}>{date.date()}</Text>
      </TouchableOpacity>
    );
  };

  const renderCalendarGrid = () => {
    const start = currentMonth.clone().startOf('month');
    const firstDay = start.day(); // 0 = Sunday
    const blanks = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = start.daysInMonth();
    const total = Math.ceil((blanks + daysInMonth) / 7) * 7;

    const cells = [];

    for (let i = 0; i < total; i++) {
      const offset = i - blanks;
      const day = start.clone().add(offset, 'days');
      const inMonth = day.month() === start.month();

      cells.push(
        <View key={i} style={{ width: '14.28%' }}>
          {renderDay(day, inMonth)}
        </View>
      );
    }

    return cells;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rota Manager</Text>
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => changeMonth(-1)}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{currentMonth.format('MMMM YYYY')}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.weekdays}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <Text key={d} style={styles.weekday}>{d}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {renderCalendarGrid()}
      </View>

      <Modal
        isVisible={modalVisible}
        onBackdropPress={() => setModalVisible(false)}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalDate}>
            {editingDate?.format('dddd, Do MMMM YYYY')}
          </Text>

          <View style={styles.personButtons}>
            <TouchableOpacity
              style={[styles.personBtn, selectedPerson === 'jordan' && styles.personBtnActiveJordan]}
              onPress={() => setSelectedPerson('jordan')}
            >
              <Text>Jordan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.personBtn, selectedPerson === 'iryna' && styles.personBtnActiveIryna]}
              onPress={() => setSelectedPerson('iryna')}
            >
              <Text>Iryna</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.personBtn, selectedPerson === 'holiday' && styles.personBtnActiveHoliday]}
              onPress={() => setSelectedPerson('holiday')}
            >
              <Text>Holiday</Text>
            </TouchableOpacity>
          </View>

          {selectedPerson === 'holiday' ? (
            <View>
              <Text style={styles.label}>Who?</Text>
              {/* You can replace with Picker later */}
              <TouchableOpacity onPress={() => setHolidayWho('both')}>
                <Text>Both {holidayWho === 'both' ? '(selected)' : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setHolidayWho('jordan')}>
                <Text>Jordan only {holidayWho === 'jordan' ? '(selected)' : ''}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setHolidayWho('iryna')}>
                <Text>Iryna only {holidayWho === 'iryna' ? '(selected)' : ''}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {selectedPerson === 'jordan' && (
                <View>
                  <Text style={styles.label}>Jordan Shift</Text>
                  <TouchableOpacity onPress={() => {/* open time picker for jStart */}}>
                    <Text>Start: {jStart ? jStart.format('HH:mm') : '—'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {/* open time picker for jEnd */}}>
                    <Text>End: {jEnd ? jEnd.format('HH:mm') : '—'}</Text>
                  </TouchableOpacity>
                  <Text>Break (min): {jBreak}</Text>
                </View>
              )}

              {selectedPerson === 'iryna' && (
                <View>
                  <Text style={styles.label}>Iryna Shift</Text>
                  {/* similar for Iryna */}
                </View>
              )}
            </>
          )}

          <TouchableOpacity style={styles.saveButton} onPress={saveDay}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.clearButton} onPress={clearDay}>
            <Text>Clear Day</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 8 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  monthTitle: { fontSize: 20, marginHorizontal: 20 },
  navArrow: { fontSize: 32, paddingHorizontal: 16 },
  weekdays: { flexDirection: 'row', marginBottom: 8 },
  weekday: { flex: 1, textAlign: 'center', color: COLORS.muted, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: COLORS.border,
  },
  otherMonth: { opacity: 0.3 },
  dayNumber: { fontSize: 16, fontWeight: '600' },
  modalContainer: { justifyContent: 'center', margin: 0 },
  modalContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    padding: 24,
    borderRadius: 16,
  },
  modalDate: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  personButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  personBtn: {
    flex: 1,
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  personBtnActiveJordan: { backgroundColor: COLORS.jordan },
  personBtnActiveIryna: { backgroundColor: COLORS.iryna },
  personBtnActiveHoliday: { backgroundColor: COLORS.holiday },
  label: { color: COLORS.muted, marginBottom: 8, marginTop: 12 },
  saveButton: {
    backgroundColor: COLORS.text,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  clearButton: { marginTop: 12, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});
