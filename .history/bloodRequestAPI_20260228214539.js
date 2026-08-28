// Blood Request Management API
class BloodRequestManager {
    constructor() {
        this.storageKey = 'bloodRequests';
        this.notificationKey = 'bloodNotifications';
    }

    // Create a new blood request
    createRequest(requestData) {
        const request = {
            id: Date.now(),
            ...requestData,
            status: 'OPEN',
            createdAt: new Date().toISOString(),
            acceptedBy: null,
            acceptedAt: null,
            unitsNeeded: requestData.unitsNeeded,
            unitsAccepted: 0
        };

        let requests = this.getAllRequests();
        requests.push(request);
        localStorage.setItem(this.storageKey, JSON.stringify(requests));

        // Find and notify nearby donors
        this.notifyNearbyDonors(request);

        return request;
    }

    // Get all blood requests
    getAllRequests() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }

    // Get request by ID
    getRequestById(id) {
        return this.getAllRequests().find(req => req.id == id);
    }

    // Find nearby donors based on location
    findNearbyDonors(city, district, ward, bloodType) {
        const donors = this.getAllDonors();
        
        // Filter donors by location and blood type
        return donors.filter(donor => {
            const locationMatch = (
                (donor.city?.toLowerCase() === city?.toLowerCase()) &&
                (donor.district?.toLowerCase() === district?.toLowerCase()) &&
                (donor.ward?.toLowerCase() === ward?.toLowerCase())
            );
            
            const bloodMatch = donor.bloodType === bloodType;
            const eligibility = donor.eligibleToDonate !== false;
            
            return locationMatch && bloodMatch && eligibility;
        });
    }

    // Get all donors (from localStorage)
    getAllDonors() {
        const data = localStorage.getItem('donors');
        return data ? JSON.parse(data) : [];
    }

    // Send notifications to nearby donors
    notifyNearbyDonors(request) {
        const nearbyDonors = this.findNearbyDonors(
            request.city,
            request.district,
            request.ward,
            request.bloodType
        );

        nearbyDonors.forEach(donor => {
            this.sendNotification(donor, request);
        });
    }

    // Send notification (Email/SMS simulation)
    sendNotification(donor, request) {
        const notification = {
            id: Date.now() + Math.random(),
            donorId: donor.id,
            donorName: donor.name,
            requestId: request.id,
            bloodType: request.bloodType,
            unitsNeeded: request.unitsNeeded,
            patientName: request.patientName,
            hospitalName: request.hospitalName,
            location: `${request.ward}, ${request.district}, ${request.city}`,
            urgency: request.urgency,
            createdAt: new Date().toISOString(),
            status: 'PENDING', // PENDING, ACCEPTED, REJECTED, CONFIRMED
            acceptedAt: null
        };

        let notifications = this.getAllNotifications();
        notifications.push(notification);
        localStorage.setItem(this.notificationKey, JSON.stringify(notifications));

        // Simulate sending email and SMS
        this.simulateSendEmail(donor, request);
        this.simulateSendSMS(donor, request);

        console.log(`Notification sent to ${donor.name} (${donor.email}, ${donor.phone})`);
    }

    // Simulate Email Notification
    simulateSendEmail(donor, request) {
        const emailContent = `
            Dear ${donor.name},
            
            An urgent blood request has been made near your location!
            
            Blood Type Needed: ${request.bloodType}
            Units Needed: ${request.unitsNeeded}
            Patient Name: ${request.patientName}
            Hospital: ${request.hospitalName}
            Location: ${request.ward}, ${request.district}, ${request.city}
            Urgency: ${request.urgency}
            
            Can you donate? Please log in to your dashboard and accept this request.
            
            Best regards,
            LifeLine Blood Bank Management System
        `;

        console.log(`📧 EMAIL SENT TO: ${donor.email}`);
        console.log(emailContent);
        
        // In production, use a backend API to send real emails
        // this.sendEmailViaAPI(donor.email, emailContent);
    }

    // Simulate SMS Notification
    simulateSendSMS(donor, request) {
        const smsContent = `Hi ${donor.name}, Blood Type ${request.bloodType} needed urgently at ${request.hospitalName}. Visit your dashboard to help. - LifeLine`;

        console.log(`📱 SMS SENT TO: ${donor.phone}`);
        console.log(smsContent);
        
        // In production, use a backend API to send real SMS
        // this.sendSMSViaAPI(donor.phone, smsContent);
    }

    // Get all notifications for a donor
    getDonorNotifications(donorId) {
        const allNotifications = this.getAllNotifications();
        return allNotifications.filter(notif => notif.donorId === donorId);
    }

    // Get all notifications
    getAllNotifications() {
        const data = localStorage.getItem(this.notificationKey);
        return data ? JSON.parse(data) : [];
    }

    // Accept a blood request notification
    acceptRequest(notificationId, donorId, unitsAccepted) {
        let notifications = this.getAllNotifications();
        let requests = this.getAllRequests();

        const notification = notifications.find(n => n.id == notificationId);
        const request = requests.find(r => r.id == notification.requestId);

        if (!notification || !request) {
            return { success: false, message: 'Request or notification not found' };
        }

        // Check if request is still open
        if (request.status !== 'OPEN') {
            return { success: false, message: 'This request has already been fulfilled' };
        }

        // Check if units can be accepted
        if (unitsAccepted + request.unitsAccepted > request.unitsNeeded) {
            return { success: false, message: 'Cannot accept more units than needed' };
        }

        // Update notification status
        notification.status = 'ACCEPTED';
        notification.acceptedAt = new Date().toISOString();

        // Update request
        request.unitsAccepted += unitsAccepted;
        request.acceptedBy = donorId;

        // If all units are accepted, mark as CONFIRMED
        if (request.unitsAccepted >= request.unitsNeeded) {
            request.status = 'CONFIRMED';
            request.acceptedAt = new Date().toISOString();

            // Reject all other pending notifications for this request
            notifications.forEach(notif => {
                if (notif.requestId === request.id && notif.status === 'PENDING' && notif.donorId !== donorId) {
                    notif.status = 'REJECTED';
                }
            });

            // Notify other donors that request is fulfilled
            this.notifyOtherDonors(request, donorId);
        }

        localStorage.setItem(this.notificationKey, JSON.stringify(notifications));
        localStorage.setItem(this.storageKey, JSON.stringify(requests));

        return { success: true, message: 'Blood request accepted successfully' };
    }

    // Notify other donors that request is fulfilled
    notifyOtherDonors(request, acceptedByDonorId) {
        const notifications = this.getAllNotifications();
        notifications.forEach(notif => {
            if (notif.requestId === request.id && notif.donorId !== acceptedByDonorId) {
                console.log(`📧 EMAIL TO ${notif.donorName}: Blood request has been fulfilled by another donor`);
                console.log(`📱 SMS TO DONOR: Blood request fulfilled. Thank you for your interest!`);
            }
        });
    }

    // Reject a blood request
    rejectRequest(notificationId) {
        let notifications = this.getAllNotifications();
        const notification = notifications.find(n => n.id == notificationId);

        if (notification) {
            notification.status = 'REJECTED';
            localStorage.setItem(this.notificationKey, JSON.stringify(notifications));
            return { success: true, message: 'Request rejected' };
        }
        return { success: false, message: 'Notification not found' };
    }

    // Get open requests for a location
    getOpenRequestsNearLocation(city, district, ward) {
        const requests = this.getAllRequests();
        return requests.filter(req => 
            req.status === 'OPEN' &&
            req.city?.toLowerCase() === city?.toLowerCase() &&
            req.district?.toLowerCase() === district?.toLowerCase() &&
            req.ward?.toLowerCase() === ward?.toLowerCase()
        );
    }

    // Update request (for checking multiple units acceptance)
    updateRequest(requestId, updates) {
        let requests = this.getAllRequests();
        const request = requests.find(r => r.id == requestId);

        if (request) {
            Object.assign(request, updates);
            localStorage.setItem(this.storageKey, JSON.stringify(requests));
            return request;
        }
        return null;
    }
}

// Create global instance
const bloodManager = new BloodRequestManager();
