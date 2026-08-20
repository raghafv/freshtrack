1. Raspberry Pi Zero 2 W

Why we use it:
The Raspberry Pi Zero 2 W is small, inexpensive and powerful enough to process camera input and run the FreshTrack software.

Individual use:

Acts as the main computer of FreshTrack.
Receives images from the camera.
Processes the captured information.
Connects to Wi-Fi.
Sends inventory information to the application.
Controls the buttons and other peripherals.

Why it is suitable:
Its small size allows it to fit inside the compact FreshTrack enclosure while still providing enough processing power for a prototype.

2. Camera Module

Why we use it:
The camera allows FreshTrack to visually identify the food item being added to the household inventory.

Individual use:

Captures an image of the food item.
Provides the image to the Raspberry Pi.
Helps identify products using image-processing/AI software.
Can be used to read visible product information such as labels.

Why it is suitable:
A camera provides a contactless method of scanning items without requiring a barcode scanner for every product.

Technical note: If you are actually building the prototype, you should specify the exact camera model. The 2 MP / 120° specification shown in your diagram is a simplified project specification and does not correspond exactly to every Raspberry Pi camera module.

3. IR LEDs – Night Vision

Why we use them:
IR LEDs provide additional illumination when the surrounding lighting is poor.

Individual use:

Illuminate objects in low-light conditions.
Help the camera capture usable images at night or in dark areas.
Improve the reliability of image capture.

Why it is suitable:
FreshTrack may be used in different lighting conditions, so additional illumination makes the camera more reliable.

4. Push Buttons

Why we use them:
Buttons provide a simple physical interface for the user.

Individual use:

+ button: Indicates that an item is being added.
− button: Indicates that an item is being removed.
Allows the user to give FreshTrack a simple command without using the phone every time.

Why it is suitable:
Buttons are cheap, simple and easy to operate.

5. USB-C Power Port

Why we use it:
FreshTrack requires a stable power supply for the Raspberry Pi and camera.

Individual use:

Provides 5 V power to the device.
Powers the Raspberry Pi.
Powers the camera and other electronic components.

Why it is suitable:
USB-C is widely available and makes the device easy to power.

6. microSD Card

Why we use it:
The Raspberry Pi needs storage for its operating system and software.

Individual use:

Stores the Raspberry Pi operating system.
Stores FreshTrack's program.
Temporarily stores captured images and inventory data.
Can store logs and configuration files.

Recommended capacity: 32–64 GB

7. Wi-Fi

Why we use it:
FreshTrack needs to communicate with the user's application/cloud system.

Individual use:

Connects the device to the home network.
Sends inventory information to the cloud/app.
Allows updated information to be received from the application.

Why it is suitable:
The Raspberry Pi Zero 2 W has built-in Wi-Fi, eliminating the need for a separate Wi-Fi module.

8. Magnetic Mount

Why we use it:
FreshTrack is designed to be attached to the outside of the refrigerator.

Individual use:

Holds the device against the refrigerator door.
Allows the device to be removed when required.
Avoids permanent modification of the refrigerator.

Why it is suitable:
A magnetic mounting system is simple and allows FreshTrack to remain portable.

9. Protective Enclosure

Why we use it:
The enclosure protects the electronic components.

Individual use:

Protects the Raspberry Pi and camera circuitry.
Provides mounting points for the buttons and camera.
Gives the product a compact finished appearance.
Prevents accidental contact with the electronics.
How the Components Work Together

Food Item → Camera → Raspberry Pi → Wi-Fi → Cloud/App → Inventory Update
