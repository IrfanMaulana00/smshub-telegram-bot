-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 04, 2025 at 04:11 AM
-- Server version: 10.4.28-MariaDB
-- PHP Version: 8.2.27

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_smsapi`
--

-- --------------------------------------------------------

--
-- Table structure for table `deposits`
--

CREATE TABLE `deposits` (
  `id` bigint(20) NOT NULL,
  `tg_user_id` bigint(20) NOT NULL,
  `amount_idr` bigint(20) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `note` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `id` bigint(20) NOT NULL,
  `tg_user_id` bigint(20) NOT NULL,
  `service` varchar(64) NOT NULL,
  `country` int(11) NOT NULL,
  `rate_usd` decimal(10,4) NOT NULL,
  `price_idr` bigint(20) NOT NULL,
  `smshub_activation_id` bigint(20) DEFAULT NULL,
  `phone_number` varchar(32) DEFAULT NULL,
  `status` enum('created','number_allocated','sms_received','canceled','finished','failed') NOT NULL DEFAULT 'created',
  `otp_code` varchar(32) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `service_rates`
--

CREATE TABLE `service_rates` (
  `id` bigint(20) NOT NULL,
  `service` varchar(64) NOT NULL,
  `default_rate_usd` decimal(10,4) NOT NULL DEFAULT 0.2000
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `service_rates`
--

INSERT INTO `service_rates` (`id`, `service`, `default_rate_usd`) VALUES
(1, 'whatsapp', 0.1000),
(2, 'instagram', 0.2000),
(3, 'telegram', 0.2000),
(4, 'google', 0.2000);

-- --------------------------------------------------------

--
-- Table structure for table `tg_users`
--

CREATE TABLE `tg_users` (
  `id` bigint(20) NOT NULL,
  `username` varchar(64) DEFAULT NULL,
  `first_name` varchar(128) DEFAULT NULL,
  `last_name` varchar(128) DEFAULT NULL,
  `balance_idr` bigint(20) NOT NULL DEFAULT 0,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `deposits`
--
ALTER TABLE `deposits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tg_user_id` (`tg_user_id`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tg_user_id` (`tg_user_id`);

--
-- Indexes for table `service_rates`
--
ALTER TABLE `service_rates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unq_service` (`service`);

--
-- Indexes for table `tg_users`
--
ALTER TABLE `tg_users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `deposits`
--
ALTER TABLE `deposits`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_rates`
--
ALTER TABLE `service_rates`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `deposits`
--
ALTER TABLE `deposits`
  ADD CONSTRAINT `deposits_ibfk_1` FOREIGN KEY (`tg_user_id`) REFERENCES `tg_users` (`id`);

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`tg_user_id`) REFERENCES `tg_users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
