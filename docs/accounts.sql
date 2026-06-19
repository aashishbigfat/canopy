-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: 192.168.4.7:3306
-- Generation Time: Jun 17, 2026 at 07:46 AM
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
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` int UNSIGNED NOT NULL,
  `name` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `account_source_id` int DEFAULT NULL,
  `billing_street` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_city` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_state` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_zip` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `billing_country` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_street` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_city` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_state` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_zip` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `shipping_country` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `acc_type_id` int DEFAULT NULL,
  `acc_parent_id` int DEFAULT NULL,
  `record_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `website` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `franchisor_id` int DEFAULT '0',
  `gstin` varchar(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rating_id` int DEFAULT NULL,
  `industry_id` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `tenant_id` varchar(250) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_by` int NOT NULL,
  `owner_id` int NOT NULL,
  `last_modified_by_id` int DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `reference_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `name`, `phone`, `email`, `description`, `account_source_id`, `billing_street`, `billing_city`, `billing_state`, `billing_zip`, `billing_country`, `shipping_street`, `shipping_city`, `shipping_state`, `shipping_zip`, `shipping_country`, `acc_type_id`, `acc_parent_id`, `record_id`, `website`, `franchisor_id`, `gstin`, `rating_id`, `industry_id`, `created_at`, `updated_at`, `tenant_id`, `created_by`, `owner_id`, `last_modified_by_id`, `deleted_at`, `reference_id`) VALUES
(2768, 'Global Travel (Chattisgarh)', '9074639939,9826138877', 'psglobaltravel@gmail.com', NULL, NULL, 'Shop No. 32,1st Floor,Samvet Shikhar Complex,Rajbandha Maidan,G.E. Road,Moudhapara road,Moudhapara', 'Raipur', 'Chhattisgarh', '492001', 'India', NULL, NULL, NULL, NULL, NULL, 1, NULL, '0000002768', 'www.globaltravel.co.in', 0, NULL, 4, 30, '2016-10-20 00:00:00', '2024-04-23 09:43:22', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 342, 404, 442, NULL, '0016F00001oqxKl'),
(3794, 'Jai Shree Travels', '8953584171, 8881177791, 9336516823', 'pushkar.verma@jaishreetravels.com', NULL, NULL, 'B-4 Modal Colony, Lane No 3, Near Gaba Chowk', 'Rudrapur', 'Uttarakhand', '263153', 'India', NULL, NULL, NULL, NULL, NULL, 1, NULL, '0000003794', 'www.jaishreetravels.com', 0, NULL, 1, 30, '2015-07-09 00:00:00', '2023-10-18 10:25:09', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 344, 344, 447, NULL, '0019000001RZC4K'),
(14247, 'Ease My Trip (Gurgaon Franchise)', '0124-4611855', 'gurugram1@easemytrip.com', NULL, NULL, 'Shop No.6, Spanish Court, Palam Vihar-2, Gurgaon, Haryana', 'Gurgaon', 'Haryana', NULL, 'India', NULL, NULL, NULL, NULL, NULL, 1, NULL, '0000014247', NULL, NULL, NULL, 4, 30, '2024-03-15 09:31:26', '2025-04-09 12:58:59', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 404, 404, 442, NULL, NULL),
(16988, 'Journey Jetsetters', '9988664465', 'kapoor.paras786@gmail.com', NULL, NULL, 'Sco 13 , First floor, city plaza, opposite Rikhi ram nand lal departmental store, Vivek Nagar, Haibowal Kalan,', 'Ludhiana', 'Punjab', '141010', 'India', NULL, NULL, NULL, NULL, NULL, 1, NULL, '0000016988', NULL, 0, NULL, 4, 30, '2025-02-06 16:46:24', '2026-06-17 12:46:58', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 442, 442, 442, NULL, NULL),
(18138, 'Shree Sai Tour and Travels', '8586028652', 'shreesaitourandtravels4@gmail.com', NULL, NULL, 'SCO 29 - 30, Dav Market,Gobindpuri Road', 'Yamunanagar', 'Haryana', '135001', 'India', NULL, NULL, NULL, NULL, NULL, 1, NULL, '0000018138', 'www.shreesaitourandtravels.co.in', NULL, NULL, 4, 30, '2025-08-19 10:46:57', '2025-08-19 10:46:57', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 447, 447, 447, NULL, NULL),
(19136, 'Funland (GO AA Malwa)', '9111110999', 'Mdlinearinn@gmail.com', NULL, NULL, 'Dharnavad, Near Zenith Drugs, Kalaria,  Dhar Road', 'Indore', 'Madhya Pradesh', '453001', 'India', NULL, NULL, NULL, NULL, NULL, 3, NULL, '0000019136', 'www.funlandindore.com', 0, NULL, 4, 17, '2026-03-03 15:28:05', '2026-03-03 15:28:52', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 447, 447, 447, NULL, NULL),
(19713, 'Reviva Tooling Systems Private Limited', '9838001358', 'info@revivatoolingsystems.co.in', NULL, NULL, 'Sector 6, Imt Manesar', 'Gurgaon', 'Haryana', '122052', 'India', NULL, NULL, NULL, NULL, NULL, 3, NULL, '0000019713', 'www.revivatoolingsystems.co.in', 0, NULL, 4, 20, '2026-06-17 12:45:41', '2026-06-17 12:46:33', 'b107b0af85f13787939057e6d09249606bc117a853b8b2bb04c79d1928754dd2', 447, 447, 447, NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `accounts_name_index` (`name`),
  ADD KEY `phone` (`phone`),
  ADD KEY `email` (`email`),
  ADD KEY `billing_state` (`billing_state`),
  ADD KEY `billing_city` (`billing_city`),
  ADD KEY `billing_country` (`billing_country`),
  ADD KEY `acc_type_id` (`acc_type_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19714;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
