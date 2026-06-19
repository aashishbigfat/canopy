-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 192.168.4.7:3306
-- Generation Time: Jun 17, 2026 at 07:49 AM
-- Server version: 8.0.37-google
-- PHP Version: 8.3.31

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `dookcrm`
--

-- --------------------------------------------------------

--
-- Table structure for table `contacts`
--

CREATE TABLE `contacts` (
  `id` int UNSIGNED NOT NULL,
  `salutation` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_email` tinyint DEFAULT '0',
  `first_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `title` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mailing_street` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mailing_city` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mailing_state` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mailing_zip` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mailing_country` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `reports_to_id` int DEFAULT NULL,
  `record_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `tenant_id` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int NOT NULL,
  `owner_id` int DEFAULT NULL,
  `last_modified_by_id` int DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `middle_name` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `department` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mobile` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `contacts`
--

INSERT INTO `contacts` (`id`, `salutation`, `email`, `is_email`, `first_name`, `last_name`, `title`, `phone`, `mailing_street`, `mailing_city`, `mailing_state`, `mailing_zip`, `mailing_country`, `dob`, `reports_to_id`, `record_id`, `created_at`, `updated_at`, `tenant_id`, `created_by`, `owner_id`, `last_modified_by_id`, `deleted_at`, `middle_name`, `department`, `mobile`, `reference_id`) VALUES
(5264, 'Ms.', 'opsrdp@jaishreetravels.com', 0, 'NEETU', 'KOLI', 'EXECUTIVE OPERATION', '+91 8881177794', '24 Modal Colony,OPP Dena Bank Gaba Chowk,', 'RUDRAPUR', 'Uttarakhand', '263153', 'India', '1970-01-01', NULL, '0000005264', '2017-11-29 00:00:00', '2017-11-29 00:00:00', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 342, 342, 342, NULL, NULL, NULL, 'opsrdp@jaishreetravels.com', '0036F00002JMzKC'),
(29164, 'Mr.', 'kapoor.paras786@gmail.com', 0, 'Paras', 'Paras', NULL, '9988664465', 'Sco 13 , First floor, city plaza, opposite Rikhi ram nand lal departmental store, Vivek Nagar, Haibowal Kalan,', 'Ludhiana', 'Punjab', '141010', 'India', NULL, NULL, '0000029164', '2025-02-06 16:46:24', '2025-02-06 16:46:24', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 442, 442, 442, NULL, NULL, NULL, '9988664465', NULL),
(31082, NULL, 'shreesaitourandtravels4@gmail.com', 0, 'Uday', 'Sharma', 'Managing Director', '8586028652', NULL, 'Yamunanagar', 'Haryana', '135001', 'India', NULL, NULL, '0000031082', '2025-08-19 10:48:07', '2025-08-19 10:48:14', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 447, 447, 447, NULL, NULL, NULL, '8586028652', NULL),
(32670, 'Mr.', 'Mdlinearinn@gmail.com', 0, 'Ankit', 'Rawat', 'Head', '9111110999', 'Dharnavad, Near Zenith Drugs, Kalaria,  Dhar Road', 'Indore', 'Madhya Pradesh', '453001', 'India', NULL, NULL, '0000032670', '2026-03-03 15:28:05', '2026-03-03 15:28:05', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 447, 447, 447, NULL, NULL, NULL, '9111110999', NULL),
(32920, 'Ms.', 'international@globaltravel.co.in', 0, 'Ankitha', 'Nayak', NULL, '8319711490', NULL, 'Raipur', 'Chhattisgarh', '492001', 'India', NULL, NULL, '0000032920', '2026-04-11 13:29:36', '2026-06-17 13:11:04', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 442, 442, 442, NULL, NULL, NULL, '8319711490', NULL),
(33197, 'Ms.', 'swati.khurana@easemytrip.com', 0, 'Swati', 'Khurana', NULL, '935507815', NULL, 'Gurgaon', 'Haryana', NULL, 'India', NULL, NULL, '0000033197', '2026-05-11 18:25:42', '2026-05-11 18:25:46', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 447, 447, 447, NULL, NULL, NULL, '935507815', NULL),
(33543, 'Mr.', 'info@revivatoolingsystems.co.in', 0, 'Rohit', 'Gupta', 'Head', '9838001358', 'Sector 6, Imt Manesar', 'Gurgaon', 'Haryana', '122052', 'India', NULL, NULL, '0000033543', '2026-06-17 12:45:41', '2026-06-17 12:45:41', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 447, 447, 447, NULL, NULL, NULL, '9838001358', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `contacts`
--
ALTER TABLE `contacts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `email` (`email`,`first_name`,`last_name`,`created_at`,`updated_at`,`created_by`,`owner_id`,`last_modified_by_id`),
  ADD KEY `dob` (`dob`),
  ADD KEY `email_2` (`email`,`first_name`,`last_name`,`dob`,`created_at`,`updated_at`,`created_by`,`owner_id`,`last_modified_by_id`),
  ADD KEY `email_3` (`email`),
  ADD KEY `last_modified_by_id` (`last_modified_by_id`),
  ADD KEY `last_modified_by_id_2` (`last_modified_by_id`),
  ADD KEY `phone` (`phone`),
  ADD KEY `mailing_city` (`mailing_city`),
  ADD KEY `mailing_state` (`mailing_state`),
  ADD KEY `name` (`first_name`,`last_name`,`email`,`department`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `contacts`
--
ALTER TABLE `contacts`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33544;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
