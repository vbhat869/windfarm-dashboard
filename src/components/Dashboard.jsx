import React, { useState, useEffect, useMemo } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import 'chart.js/auto';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import _ from 'lodash';
import moment from 'moment';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { fetchDevices, fetchFaults } from '../services'

Chart.register(...registerables); // Register all Chart.js components

const Dashboard = () => {
  const [devices, setDevices] = useState([]);
  const [faults, setFaults] = useState([]);
  const [selectedWindfarm, setSelectedWindfarm] = useState('Minneapolis');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedCode, setSelectedCode] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const devicesData = await fetchDevices();
        const faultsData = await fetchFaults();
        setDevices(devicesData);
        setFaults(faultsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    loadData();
  }, []);

  const handleWindfarmChange = (event) => {
    setSelectedWindfarm(event.target.value);
  };

  const handleDeviceChange = (event) => {
    setSelectedDevice(event.target.value);
  };

  const handleCodeChange = (event) => {
    setSelectedCode(event.target.value);
  };

  const filteredFaults = faults.filter(fault => {
    const device = devices.find(device => device.id === fault.device_id);
    const isWindfarmMatch = device && device.asset === selectedWindfarm;
    const isDeviceMatch = selectedDevice ? device && device.device_name === selectedDevice : true;
    const isDateMatch = startDate && endDate ? moment(fault.time_stamp).isBetween(startDate, endDate, undefined, '[]') : true;
    const isCodeMatch = selectedCode ? fault.code.toString() === selectedCode : true;
    return isWindfarmMatch && isDeviceMatch && isDateMatch && isCodeMatch;
  });

  // Calculate statistics
  const top10Duration = _.orderBy(filteredFaults, ['duration_seconds'], ['desc']).slice(0, 10);
  const top10Frequency = _(filteredFaults).countBy('code').map((count, code) => ({ code, count })).orderBy('count', 'desc').slice(0, 10).value();
  const alarmsByCategoryDuration = _.groupBy(filteredFaults, 'category');

  // Prepare chart data
  const durationChartData = {
    labels: top10Duration.map(fault => fault.code),
    datasets: [{
      label: 'Duration (seconds)',
      data: top10Duration.map(fault => fault.duration_seconds),
      backgroundColor: 'rgba(75,192,192,0.4)',
      borderColor: 'rgba(75,192,192,1)',
      borderWidth: 1
    }]
  };

  const frequencyChartData = {
    labels: top10Frequency.map(fault => fault.code),
    datasets: [{
      label: 'Frequency',
      data: top10Frequency.map(fault => fault.count),
      backgroundColor: 'rgba(153,102,255,0.4)',
      borderColor: 'rgba(153,102,255,1)',
      borderWidth: 1
    }]
  };

  const categoryDurationData = {
    labels: Object.keys(alarmsByCategoryDuration),
    datasets: [{
      label: 'Duration',
      data: Object.keys(alarmsByCategoryDuration).map(category => _.sumBy(alarmsByCategoryDuration[category], 'duration_seconds')),
      backgroundColor: [
        'rgba(255,99,132,0.2)',
        'rgba(54,162,235,0.2)',
        'rgba(255,206,86,0.2)',
        'rgba(75,192,192,0.2)',
        'rgba(153,102,255,0.2)',
        'rgba(255,159,64,0.2)'
      ],
      borderColor: [
        'rgba(255,99,132,1)',
        'rgba(54,162,235,1)',
        'rgba(255,206,86,1)',
        'rgba(75,192,192,1)',
        'rgba(153,102,255,1)',
        'rgba(255,159,64,1)'
      ],
      borderWidth: 1
    }]
  };

  const categoryFrequencyData = {
    labels: Object.keys(alarmsByCategoryDuration),
    datasets: [{
      label: 'Frequency',
      data: Object.keys(alarmsByCategoryDuration).map(category => alarmsByCategoryDuration[category].length),
      backgroundColor: [
        'rgba(255,99,132,0.2)',
        'rgba(54,162,235,0.2)',
        'rgba(255,206,86,0.2)',
        'rgba(75,192,192,0.2)',
        'rgba(153,102,255,0.2)',
        'rgba(255,159,64,0.2)'
      ],
      borderColor: [
        'rgba(255,99,132,1)',
        'rgba(54,162,235,1)',
        'rgba(255,206,86,1)',
        'rgba(75,192,192,1)',
        'rgba(153,102,255,1)',
        'rgba(255,159,64,1)'
      ],
      borderWidth: 1
    }]
  };

  const columnDefs = [
    { headerName: 'Date', field: 'time_stamp', cellRenderer: ({ value }) => moment(value).format('YYYY-MM-DD HH:mm:ss') },
    { headerName: 'Duration (seconds)', field: 'duration_seconds' },
    { headerName: 'Alarm Code', field: 'code' ,},
    { headerName: 'Description', field: 'description' },
    { headerName: 'Device Name', field: 'device_name', valueGetter: params => devices.find(device => device.id === params.data.device_id)?.device_name },
    { headerName: 'Category', field: 'category' },
    { headerName: 'Resolution Time', field: 'resolution_time_stamp', cellRenderer: ({ value }) => moment(value).format('YYYY-MM-DD HH:mm:ss') },
   ];

   const defaultColDef = useMemo(() => {
    return {
        filter: 'agTextColumnFilter',
        floatingFilter: true,
    };
}, []);
  return (
    <div className="dashboard">
      <div className="filters">
        <select onChange={handleWindfarmChange} value={selectedWindfarm}>
          <option value="Minneapolis">Minneapolis</option>
          <option value="Colorado">Colorado</option>
        </select>
        <select onChange={handleDeviceChange} value={selectedDevice}>
          <option value="">All Devices</option>
          {devices.filter(device => device.asset === selectedWindfarm).map(device => (
            <option key={device.id} value={device.device_name}>{device.device_name}</option>
          ))}
        </select>
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          placeholderText="Start Date"
          dateFormat="yyyy-MM-dd"
          showTimeSelect
          className='custom-date'
        />
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          placeholderText="End Date"
          dateFormat="yyyy-MM-dd"
          showTimeSelect
          className='custom-date'
        />
        <input
          type="text"
          placeholder="Code"
          value={selectedCode}
          onChange={handleCodeChange}
        />
      </div>
      <div className="tiles">
        <div>Total Faults: {filteredFaults.length}</div>
        <div>Total Duration: {moment(_.sumBy(filteredFaults, 'duration_seconds')).format('HH:mm:ss')}</div>
      </div>
      <div className="charts">
        <div className="chart-container">
          <Bar data={durationChartData} options={{ maintainAspectRatio: false }} />
        </div>
        <div className="chart-container">
          <Bar data={frequencyChartData} options={{ maintainAspectRatio: false }} />
        </div>
        <div className="chart-container">
          <Pie data={categoryDurationData} options={{ maintainAspectRatio: false }} />
        </div>
        <div className="chart-container">
          <Pie data={categoryFrequencyData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>
      <div className="table-container ag-theme-alpine">
      <AgGridReact
          rowData={filteredFaults}
          columnDefs={columnDefs}
          pagination={true}
          paginationPageSize={10}
          enableSorting={true}
          enableFilter={true}
          defaultColDef={defaultColDef}
        />
      </div>
    </div>
  );
};

export default Dashboard;
