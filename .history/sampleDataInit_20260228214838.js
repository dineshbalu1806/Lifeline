// Initialize Sample Data for Testing Blood Request System
function initializeSampleData() {
    // Check if data already exists
    if (localStorage.getItem('donors')) {
        console.log('Sample data already initialized');
        return;
    }

    // Sample donors data
    const sampleDonors = [
        {
            id: 'donor1',
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '+1-234-567-8900',
            bloodType: 'O+',
            city: 'New York',
            district: 'Manhattan',
            ward: 'Ward A',
            address: 'New York, 123 Main Street',
            eligibleToDonate: true
        },
        {
            id: 'donor2',
            name: 'Sarah Johnson',
            email: 'sarah.johnson@email.com',
            phone: '+1-234-567-8901',
            bloodType: 'A+',
            city: 'New York',
            district: 'Manhattan',
            ward: 'Ward A',
            address: 'New York, 456 Oak Avenue',
            eligibleToDonate: true
        },
        {
            id: 'donor3',
            name: 'Michael Brown',
            email: 'michael.brown@email.com',
            phone: '+1-234-567-8902',
            bloodType: 'B+',
            city: 'New York',
            district: 'Brooklyn',
            ward: 'Ward B',
            address: 'New York, 789 Elm Street',
            eligibleToDonate: true
        },
        {
            id: 'donor4',
            name: 'Emily Davis',
            email: 'emily.davis@email.com',
            phone: '+1-234-567-8903',
            bloodType: 'AB+',
            city: 'New York',
            district: 'Queens',
            ward: 'Ward C',
            address: 'New York, 321 Pine Road',
            eligibleToDonate: true
        },
        {
            id: 'donor5',
            name: 'David Wilson',
            email: 'david.wilson@email.com',
            phone: '+1-234-567-8904',
            bloodType: 'O+',
            city: 'New York',
            district: 'Manhattan',
            ward: 'Ward A',
            address: 'New York, 654 Maple Drive',
            eligibleToDonate: true
        }
    ];

    localStorage.setItem('donors', JSON.stringify(sampleDonors));
    console.log('Sample donors data initialized');
}

// Run initialization when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSampleData);
} else {
    initializeSampleData();
}
